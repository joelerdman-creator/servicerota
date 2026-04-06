"use server";

import type { AutoAssignInput, AssignmentPlan, AssignmentHistoryEntry } from "./types";

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
//      a. Already assigned to this event in this run (removed from pool)
//      b. Does not hold the required role qualification
//      c. Marked unavailable on the event date
//      d. Has service-series preferences that exclude this series
//      e. servingPreference = ONLY_WITH_FAMILY and no family member is
//         scheduled at this event
//
//   2. Soft scoring (higher = higher priority), evaluated per-role:
//      Looks at the volunteer's assignment history for this specific role
//      within a rolling 6-month window:
//        score = -(roleCount6Mo × 10) + daysSinceLastRoleAssignment
//      If never assigned to this role in the window: daysSince = 180
//      Family bonus: +20 if servingPreference = PREFER_FAMILY and a family
//        member is already scheduled for this event
//
// Role ordering within an event:
//   Roles are sorted by the number of qualified volunteers ASCENDING so the
//   hardest-to-fill roles are attempted first (scarcity-first).
//
// Per-role re-scoring:
//   The volunteer pool is re-sorted for each role within an event, using
//   that role's specific scoring. This ensures a volunteer with heavy Lector
//   history isn't deprioritized for an Usher slot they rarely fill.
//
// Cross-event fairness:
//   In-memory history is updated after each assignment, so later events in
//   a batch run reflect assignments already made in the same run.
// ---------------------------------------------------------------------------

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

export async function deterministicAutoAssign(
  input: AutoAssignInput,
): Promise<AssignmentPlan> {
  const eventList = input.events
    ? input.events
    : input.event
    ? [input.event]
    : [];

  const { volunteers, roleTemplates } = input;

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

  // Mutable per-volunteer assignment history — updated as assignments are made
  // so later events (and later roles within an event) score against up-to-date data.
  const userStats = new Map<string, { assignmentHistory: AssignmentHistoryEntry[] }>();
  volunteers.forEach((v) => {
    userStats.set(v.id, {
      assignmentHistory: v.assignmentHistory ? [...v.assignmentHistory] : [],
    });
  });

  // Track new entries added this run (collected for userUpdates output)
  const newHistoryEntries = new Map<string, AssignmentHistoryEntry[]>();

  // ----- Scoring -----------------------------------------------------------

  const now = Date.now();
  const cutoffMs = now - SIX_MONTHS_MS;

  // Score a volunteer for a specific role using the 6-month rolling window.
  const getRoleScore = (volunteerId: string, roleTemplateId: string): number => {
    const stats = userStats.get(volunteerId);
    if (!stats) return -Infinity;

    const roleHistory = stats.assignmentHistory.filter(
      (h) =>
        h.roleTemplateId === roleTemplateId &&
        new Date(h.date).getTime() >= cutoffMs,
    );

    const count = roleHistory.length;
    let daysSince: number;
    if (roleHistory.length > 0) {
      const lastMs = Math.max(...roleHistory.map((h) => new Date(h.date).getTime()));
      daysSince = (now - lastMs) / (1000 * 3600 * 24);
    } else {
      // No history for this role in the window — treat as if last served the
      // full window ago, giving them equal footing with others at zero count.
      daysSince = 180;
    }

    return -(count * 10) + daysSince;
  };

  const getFairnessScore = (
    volunteer: (typeof volunteers)[number],
    eventId: string,
    roleTemplateId: string,
  ): number => {
    let score = getRoleScore(volunteer.id, roleTemplateId);

    // Family preference bonus — reduced to +20 (≈ 20 days of recency)
    if (volunteer.familyId && volunteer.servingPreference === "PREFER_FAMILY") {
      if (familyAssignedToEvent.get(eventId)?.has(volunteer.familyId)) {
        score += 20;
      }
    }

    return score;
  };

  // ----- Scarcity helper --------------------------------------------------

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
    const eventDateStr = new Date(event.eventDate).toISOString().split("T")[0];
    const eventSeriesId = event.seriesId;

    const rolesForThisEvent = allUnassignedRoles.filter(
      (r) => r.eventId === event.id && unassignedRoleIds.has(r.id),
    );

    if (rolesForThisEvent.length === 0) continue;

    // Sort roles by scarcity: fewest qualified volunteers first.
    rolesForThisEvent.sort(
      (a, b) =>
        countEligible(a.roleName, eventDateStr, eventSeriesId) -
        countEligible(b.roleName, eventDateStr, eventSeriesId),
    );

    // Mutable pool of remaining volunteers for this event.
    // Volunteers are removed as they are assigned (one role per volunteer per event).
    const eventPool = [...volunteers];

    for (const role of rolesForThisEvent) {
      const normalizedRoleName = role.roleName.trim().toLowerCase();
      const roleTemplateId = roleTemplateMap.get(normalizedRoleName);

      if (!roleTemplateId) {
        unassignedReasons.push(
          `"${role.roleName}" at "${event.eventName}" — no matching role template (check spelling).`,
        );
        continue;
      }

      // Re-sort the remaining pool specifically for this role's scoring.
      // This is the key difference from a single per-event sort: a volunteer
      // with heavy Lector history won't be penalised when scoring for Usher.
      const sortedPool = [...eventPool].sort(
        (a, b) =>
          getFairnessScore(b, event.id, roleTemplateId) -
          getFairnessScore(a, event.id, roleTemplateId),
      );

      let filled = false;
      let lastRejectReason = "No volunteers are qualified for this role.";

      for (const v of sortedPool) {
        // A. Role qualification
        if (!v.availableRoleIds?.includes(roleTemplateId)) {
          lastRejectReason = "No available volunteers are qualified for this role.";
          continue;
        }

        // B. Unavailability
        if (v.unavailability?.includes(eventDateStr)) {
          lastRejectReason = "All qualified volunteers are unavailable on this date.";
          continue;
        }

        // C. Service series preference
        if (
          eventSeriesId &&
          v.availableRecurringEventSeriesIds &&
          v.availableRecurringEventSeriesIds.length > 0 &&
          !v.availableRecurringEventSeriesIds.includes(eventSeriesId)
        ) {
          lastRejectReason = "All qualified volunteers prefer a different service time.";
          continue;
        }

        // D. Family constraint (hard block)
        if (v.servingPreference === "ONLY_WITH_FAMILY") {
          if (v.familyId && !familyAssignedToEvent.get(event.id)?.has(v.familyId)) {
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

        unassignedRoleIds.delete(role.id);

        // Update family tracking so subsequent roles in this event benefit from
        // PREFER_FAMILY / ONLY_WITH_FAMILY logic.
        if (v.familyId) {
          if (!familyAssignedToEvent.has(event.id)) {
            familyAssignedToEvent.set(event.id, new Set());
          }
          familyAssignedToEvent.get(event.id)!.add(v.familyId);
        }

        // Update in-memory history so later roles/events score correctly.
        const entry: AssignmentHistoryEntry = { roleTemplateId, date: eventDateStr };
        userStats.get(v.id)!.assignmentHistory.push(entry);

        // Accumulate new entries for the userUpdates output.
        if (!newHistoryEntries.has(v.id)) newHistoryEntries.set(v.id, []);
        newHistoryEntries.get(v.id)!.push(entry);

        // Remove from event pool — each volunteer fills at most one role per event.
        const idx = eventPool.findIndex((p) => p.id === v.id);
        if (idx !== -1) eventPool.splice(idx, 1);

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
  newHistoryEntries.forEach((entries, volunteerId) => {
    userUpdates.push({ volunteerId, newHistoryEntries: entries });
  });

  // ----- Reasoning string -------------------------------------------------

  const totalOpen = (input.allRoles || []).filter(
    (r) => !r.assignedVolunteerId,
  ).length;

  let reasoning = `Assigned ${assignments.length} of ${totalOpen} open roles using per-role fairness scoring (6-month rolling window: balances role-specific serving count and recency).`;

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
