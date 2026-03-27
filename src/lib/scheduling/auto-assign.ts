
"use server";

import type { AutoAssignInput, AssignmentPlan } from "./types";

// The main exported function that calls the flow
export async function autoAssignVolunteers(
  input: AutoAssignInput,
): Promise<AssignmentPlan> {
  // Directly call the TypeScript implementation
  return deterministicAutoAssign(input);
}

// --- Deterministic Auto-Assign Implementation ---

export async function deterministicAutoAssign(input: AutoAssignInput): Promise<AssignmentPlan> {
  // FIX: Ensure eventList is always an array, whether from a single event or a list.
  const eventList = input.events ? input.events : (input.event ? [input.event] : []);
  
  const {
    volunteers,
    roleTemplates,
  } = input;
  // FIX: Always derive unassigned roles from the complete list inside the function
  // to ensure roles that were manually unassigned are included.
  const allUnassignedRoles = (input.allRoles || []).filter(
      (r) => !r.assignedVolunteerId,
    );


  const assignments: AssignmentPlan["assignments"] = [];
  const unassignedReasons: string[] = [];
  type VolunteerType = (typeof volunteers)[number];

  // Pre-process templates for quick lookup (Normalize names to lowercase for robust matching)
  const roleTemplateMap = new Map(roleTemplates.map((rt) => [rt.name.trim().toLowerCase(), rt.id]));
  
  // Create a mutable map of user stats that we can update during the run
  const userStats = new Map<string, { assignmentCount: number, lastAssigned?: string }>();
  volunteers.forEach(v => {
      userStats.set(v.id, {
          assignmentCount: v.assignmentCount || 0,
          lastAssigned: v.lastAssigned
      });
  });

  const getFairnessScore = (volunteer: VolunteerType): number => {
    const stats = userStats.get(volunteer.id);
    if (!stats) return -Infinity; // Should not happen

    let score = 0;
    score -= stats.assignmentCount * 10;
    if (stats.lastAssigned) {
      const daysSinceAssigned =
        (new Date().getTime() - new Date(stats.lastAssigned).getTime()) /
        (1000 * 3600 * 24);
      score += daysSinceAssigned;
    } else {
      score += 365; // Give a large bonus to never-assigned volunteers
    }
    return score;
  };

  // Create a master volunteer list that can be sorted
  const masterVolunteerList = [...volunteers];
  
  // Create a set of all role IDs that need assigning at the start.
  // This helps us track which specific role instances are filled.
  const unassignedRoleIds = new Set(allUnassignedRoles.map(r => r.id));

  // Iterate over each event to be scheduled
  for (const event of eventList) {
    // Correctly filter for roles ONLY in the current event
    const rolesForThisEvent = allUnassignedRoles.filter(
      (role) => role.eventId === event.id,
    );
    
    if (rolesForThisEvent.length === 0) {
      continue; // No unassigned roles to fill for this event
    }

    // Create a fresh, mutable pool of volunteers for THIS event's scheduling run
    // And sort it based on the CURRENT fairness scores
    const eventVolunteerPool = masterVolunteerList
        .slice() // Create a copy
        .sort((a, b) => getFairnessScore(b) - getFairnessScore(a));

    const assignedVolunteerIdsThisEvent = new Set<string>();
    const eventDateStr = new Date(event.eventDate).toISOString().split("T")[0];
    const eventSeriesId = event.seriesId;

    // Iterate through the roles for the current event
    for (const role of rolesForThisEvent) {
       if (!unassignedRoleIds.has(role.id)) {
        continue; // This specific role instance is already handled
      }
      
      let roleFilled = false;
      let failureReason = "No eligible volunteers found.";
      
      const normalizedRoleName = role.roleName.trim().toLowerCase();
      const roleTemplateId = roleTemplateMap.get(normalizedRoleName);

      if (!roleTemplateId) {
          unassignedReasons.push(`Role '${'\'\''}${role.roleName}' in event '${'\'\''}${event.eventName}' does not match any known Role Template. Please check spelling.`);
          continue;
      }

      // Find a suitable volunteer from the current event's pool
      for (let i = 0; i < eventVolunteerPool.length; i++) {
        const volunteer = eventVolunteerPool[i];

        // --- CHECK ELIGIBILITY ---
        // A. Already assigned to this event in this run?
        if (assignedVolunteerIdsThisEvent.has(volunteer.id)) {
          continue;
        }

        // B. Role compatibility
        if (!volunteer.availableRoleIds?.includes(roleTemplateId)) {
          continue;
        }

        // C. Service preference (NEW LOGIC)
        // If an event is part of a series AND the volunteer has preferences, they must match.
        if (eventSeriesId && volunteer.availableRecurringEventSeriesIds && volunteer.availableRecurringEventSeriesIds.length > 0) {
            if (!volunteer.availableRecurringEventSeriesIds.includes(eventSeriesId)) {
                failureReason = `${'\'\''}${volunteer.firstName} does not prefer this service time.`;
                continue;
            }
        }


        // D. Unavailability
        if (volunteer.unavailability?.includes(eventDateStr)) {
          continue;
        }
        
        // --- ASSIGN VOLUNTEER ---
        assignments.push({
          roleId: role.id,
          eventId: event.id,
          roleName: role.roleName,
          volunteerId: volunteer.id,
          volunteerName: `${'\'\''}${volunteer.firstName} ${'\'\''}${volunteer.lastName}`,
        });

        // Mark as assigned for THIS event
        assignedVolunteerIdsThisEvent.add(volunteer.id);
        
        // Mark this specific role ID as filled
        unassignedRoleIds.delete(role.id);

        // DYNAMICALLY UPDATE THE STATS for the next fairness score calculation
        const currentStats = userStats.get(volunteer.id);
        if (currentStats) {
            currentStats.assignmentCount++;
            currentStats.lastAssigned = new Date(event.eventDate).toISOString();
        }
        
        // Remove from this event's pool so they can't be assigned to another role in the same event.
        eventVolunteerPool.splice(i, 1);
        roleFilled = true;
        
        // Break from the inner volunteer loop since we found someone for this role
        break; 
      }
      if (!roleFilled) {
        unassignedReasons.push(`Could not find a volunteer for ${'\'\''}${role.roleName} on ${'\'\''}${new Date(event.eventDate).toLocaleDateString()}. (Reason: ${'\'\''}${failureReason})`);
      }
    }
  }
  
  // Construct the final user updates from our in-memory stats map
  const userUpdates: AssignmentPlan["userUpdates"] = [];
  userStats.forEach((stats, volunteerId) => {
      const originalVolunteer = volunteers.find(v => v.id === volunteerId);
      // Only include updates for users who were actually assigned something
      if (originalVolunteer && (originalVolunteer.assignmentCount !== stats.assignmentCount || originalVolunteer.lastAssigned !== stats.lastAssigned)) {
         userUpdates.push({
            volunteerId,
            newAssignmentCount: stats.assignmentCount,
            newLastAssigned: stats.lastAssigned || new Date().toISOString(),
         });
      }
  });

  let reasoning = `Deterministically assigned ${'\'\''}${
      assignments.length
    } out of ${'\'\''}${
      (input.allRoles || []).filter(r => !r.assignedVolunteerId).length
    } open roles based on fairness rules and volunteer constraints.`;
    
  if (unassignedReasons.length > 0) {
      reasoning += `\n\nUnfilled Roles:\n- ${'\'\''}${unassignedReasons.slice(0, 10).join('\n- ')}`;
      if (unassignedReasons.length > 10) {
          reasoning += `\n- ...and ${'\'\''}${unassignedReasons.length - 10} more.`
      }
  }

  return {
    assignments,
    userUpdates,
    reasoning,
  };
}
