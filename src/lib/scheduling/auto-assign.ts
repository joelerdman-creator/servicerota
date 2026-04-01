"use server";

import type { AutoAssignInput, AssignmentPlan } from "./types";

export async function autoAssignVolunteers(
  input: AutoAssignInput,
): Promise<AssignmentPlan> {
  return deterministicAutoAssign(input);
}

// ---------------------------------------------------------------------------
// Deterministic Auto-Assign
// ---------------------------------------------------------------------------
//
// Priority order when selecting a volunteer for a role:
//   1. Hard constraints (blocks assignment entirely):
//      a. Already assigned to this event in this run
//      b. Does not hold the required role qualification
//      c. Marked unavailable on the event date
//      d. Has service-series preferences that exclude this series
//      e. servingPreference = ONLY_WITH_FAMILY and no family member is
//         scheduled at this event
//
//   2. Soft scoring (higher = higher priority):
//      base = -assignmentCount * 10  +  daysSinceLastAssigned
//           (never-assigned volunteers receive +365 bonus)
//      family bonus: +50 if servingPreference = PREFER_FAMILY and a family
//         member is already scheduled for this event
//
// Role ordering within an event:
//   Roles are sorted by the number of qualified volunteers ASCENDING so the
//   hardest-to-fill roles are attempted first (scarcity-first).
//
// Family tracking:
//   familyAssignedToEvent tracks which familyIds have at least one member
//   assigned to each event. It is seeded from pre-existing assignments and
//   updated dynamically as this run assigns new volunteers.
// ---------------------------------------------------------------------------

export async function deterministicAutoAssign(
  input: AutoAssignInput,
): Promise<AssignmentPlan> {
  const eventList = input.events
    ? input.events
    : input.event
    ? [input.event]
    : [];

  const { volunteers, roleTemplates } = input;

  // All roles that still need filling
  const allUnassignedRoles = (input.allRoles || []).filter(
    (r) => !r.assignedVolunteerId,
  );

  const assignments: AssignmentPlan["assignments"] = [];
  const unassignedReasons: string[] = [];

  // ----- Pre-computation helpers ------------------------------------------

  // Role template lookup: normalized name → template id
  const roleTemplateMap = new Map(
    roleTemplates.map((rt) => [rt.name.trim().toLowerCase(), rt.id]),
  );

  // Family lookup: volunteerId → familyId
  const volunteerFamilyMap = new Map<string, string>();
  volunteers.forEach((v) => {
    if (v.familyId) volunteerFamilyMap.set(v.id, v.familyId);
  });

  // Track which family groups are represented at each event.
  // Seeded from roles that were ALREADY assigned before this run.
  const familyAssignedToEvent = new Map<string, Set<string>>();
  (input.allRoles || [])
    .filter((r) => r.assignedVolunteerId)
    .forEach((r) => {
      const fid = volunteerFamilyMap.get(r.assignedVolunteerId!);
      if (fid) {
        if (!familyAssignedToEvent.has(r.eventId)) {
          familyAssignedToEvent.set(r.eventId, new Set());
        }
        familyAssignedToEvent.get(r.eventId)!.add(fid);
      }
    });

  // Mutable stats updated as assignments are made (so later events use
  // up-to-date fairness data).
  const userStats = new Map<
    string,
    { assignmentCount: number; lastAssigned?: string }
  >();
  volunteers.forEach((v) => {
    userStats.set(v.id, {
      assignmentCount: v.assignmentCount || 0,
      lastAssigned: v.lastAssigned,
    });
  });

  // ----- Scoring -----------------------------------------------------------

  const getBaseScore = (volunteerId: string): number => {
    const stats = userStats.get(volunteerId);
    if (!stats) return -Infinity;
    let score = -(stats.assignmentCount * 10);
    if (stats.lastAssigned) {
      const daysSince =
        (Date.now() - new Date(stats.lastAssigned).getTime()) /
        (1000 * 3600 * 24);
      score += daysSince;
    } else {
      score += 365; // never-assigned bonus
    }
    return score;
  };

  const getFairnessScore = (
    volunteer: (typeof volunteers)[number],
    eventId: string,
  ): number => {
    let score = getBaseScore(volunteer.id);

    // Family preference bonus
    if (
      volunteer.familyId &&
      volunteer.servingPreference === "PREFER_FAMILY"
    ) {
      if (familyAssignedToEvent.get(eventId)?.has(volunteer.familyId)) {
        score += 50;
      }
    }

    return score;
  };

  // ----- Scarcity helper --------------------------------------------------

  // Count volunteers eligible for a given role/event combination.
  // Used to sort roles within an event so scarce roles are filled first.
  const countEligible = (
    roleName: string,
    eventDateStr: string,
    eventSeriesId: string | undefined,
  ): number => {
    const templateId = roleTemplateMap.get(roleName.trim().toLowerCase());
    if (!templateId) return 0;
    return volunteers.filter((v) => {
      if (!v.availableRoleIds?.includes(templateId)) return false;
      if (v.unavailability?.includes(eventDateStr)) return false;
      if (
        eventSeriesId &&
        v.availableRecurringEventSeriesIds &&
        v.availableRecurringEventSeriesIds.length > 0 &&
        !v.availableRecurringEventSeriesIds.includes(eventSeriesId)
      )
        return false;
      return true;
    }).length;
  };

  // ----- Main loop --------------------------------------------------------

  const unassignedRoleIds = new Set(allUnassignedRoles.map((r) => r.id));

  for (const event of eventList) {
    const eventDateStr = new Date(event.eventDate)
      .toISOString()
      .split("T")[0];
    const eventSeriesId = event.seriesId;

    // Roles for this event that still need filling
    const rolesForThisEvent = allUnassignedRoles.filter(
      (r) => r.eventId === event.id && unassignedRoleIds.has(r.id),
    );

    if (rolesForThisEvent.length === 0) continue;

    // Sort roles by scarcity: fewest qualified volunteers first.
    // This ensures hard-to-fill roles are attempted before the volunteer
    // pool is depleted by easier roles.
    rolesForThisEvent.sort(
      (a, b) =>
        countEligible(a.roleName, eventDateStr, eventSeriesId) -
        countEligible(b.roleName, eventDateStr, eventSeriesId),
    );

    // Fresh volunteer pool for this event, sorted by fairness score
    const eventPool = [...volunteers].sort(
      (a, b) =>
        getFairnessScore(b, event.id) - getFairnessScore(a, event.id),
    );

    // Track who has been assigned in this event (one role per volunteer per event)
    const assignedThisEvent = new Set<string>();

    for (const role of rolesForThisEvent) {
      const normalizedRoleName = role.roleName.trim().toLowerCase();
      const roleTemplateId = roleTemplateMap.get(normalizedRoleName);

      if (!roleTemplateId) {
        unassignedReasons.push(
          `"${role.roleName}" at "${event.eventName}" — no matching role template (check spelling).`,
        );
        continue;
      }

      let filled = false;
      // Track why the last candidate was rejected (for diagnostics)
      let lastRejectReason =
        "No volunteers are qualified for this role.";

      for (let i = 0; i < eventPool.length; i++) {
        const v = eventPool[i];

        // A. Already assigned to this event
        if (assignedThisEvent.has(v.id)) continue;

        // B. Role qualification
        if (!v.availableRoleIds?.includes(roleTemplateId)) {
          lastRejectReason = "No available volunteers are qualified for this role.";
          continue;
        }

        // C. Unavailability
        if (v.unavailability?.includes(eventDateStr)) {
          lastRejectReason = "All qualified volunteers are unavailable on this date.";
          continue;
        }

        // D. Service series preference
        if (
          eventSeriesId &&
          v.availableRecurringEventSeriesIds &&
          v.availableRecurringEventSeriesIds.length > 0 &&
          !v.availableRecurringEventSeriesIds.includes(eventSeriesId)
        ) {
          lastRejectReason =
            "All qualified volunteers prefer a different service time.";
          continue;
        }

        // E. Family constraint (hard block)
        if (v.servingPreference === "ONLY_WITH_FAMILY") {
          if (!v.familyId) {
            // No family defined — treat as no constraint
          } else if (
            !familyAssignedToEvent.get(event.id)?.has(v.familyId)
          ) {
            lastRejectReason = `${v.firstName} only serves with family members, and none are scheduled for this event yet.`;
            continue;
          }
        }

        // ---- Assign ----
        assignments.push({
          roleId: role.id,
          eventId: event.id,
          roleName: role.roleName,
          volunteerId: v.id,
          volunteerName: `${v.firstName} ${v.lastName}`,
        });

        assignedThisEvent.add(v.id);
        unassignedRoleIds.delete(role.id);

        // Update family tracking so subsequent roles in this event can
        // benefit from the PREFER_FAMILY / ONLY_WITH_FAMILY logic.
        if (v.familyId) {
          if (!familyAssignedToEvent.has(event.id)) {
            familyAssignedToEvent.set(event.id, new Set());
          }
          familyAssignedToEvent.get(event.id)!.add(v.familyId);
        }

        // Update in-memory stats for future fairness scoring
        const stats = userStats.get(v.id);
        if (stats) {
          stats.assignmentCount++;
          stats.lastAssigned = new Date(event.eventDate).toISOString();
        }

        // Remove from pool so they can't fill a second role this event
        eventPool.splice(i, 1);
        filled = true;
        break;
      }

      if (!filled) {
        unassignedReasons.push(
          `"${role.roleName}" at "${event.eventName}" on ${new Date(event.eventDate).toLocaleDateString()} — ${lastRejectReason}`,
        );
      }
    }
  }

  // ----- Build user update list -------------------------------------------

  const userUpdates: AssignmentPlan["userUpdates"] = [];
  userStats.forEach((stats, volunteerId) => {
    const original = volunteers.find((v) => v.id === volunteerId);
    if (
      original &&
      (original.assignmentCount !== stats.assignmentCount ||
        original.lastAssigned !== stats.lastAssigned)
    ) {
      userUpdates.push({
        volunteerId,
        newAssignmentCount: stats.assignmentCount,
        newLastAssigned: stats.lastAssigned || new Date().toISOString(),
      });
    }
  });

  // ----- Reasoning string -------------------------------------------------

  const totalOpen = (input.allRoles || []).filter(
    (r) => !r.assignedVolunteerId,
  ).length;

  let reasoning = `Assigned ${assignments.length} of ${totalOpen} open roles using fairness scoring (balances assignment count and time since last served).`;

  if (unassignedReasons.length > 0) {
    const shown = unassignedReasons.slice(0, 10);
    reasoning +=
      `\n\nUnfilled roles (${unassignedReasons.length}):\n• ` +
      shown.join("\n• ");
    if (unassignedReasons.length > 10) {
      reasoning += `\n• …and ${unassignedReasons.length - 10} more.`;
    }
  }

  return { assignments, userUpdates, reasoning };
}
