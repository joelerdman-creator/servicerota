/**
 * Conflict Detection Utility
 * Checks for double-booked volunteers across events before publishing.
 */

import type { WithId } from "@/firebase";

interface RoleForConflict {
  id: string;
  eventId: string;
  roleName: string;
  assignedVolunteerId: string | null;
  assignedVolunteerName: string | null;
}

interface EventForConflict {
  id: string;
  eventName: string;
  eventDate: string;
}

export interface VolunteerConflict {
  volunteerId: string;
  volunteerName: string;
  events: {
    eventId: string;
    eventName: string;
    eventDate: string;
    roleName: string;
  }[];
}

/**
 * Detects volunteers who are assigned to multiple roles across overlapping events.
 * Two events "overlap" if they occur on the same calendar date.
 *
 * @returns Array of conflicts. Empty if no conflicts found.
 */
export function detectVolunteerConflicts(
  events: EventForConflict[],
  rolesByEvent: Map<string, RoleForConflict[]>,
): VolunteerConflict[] {
  // Group events by date (YYYY-MM-DD)
  const eventsByDate = new Map<string, EventForConflict[]>();
  for (const event of events) {
    const dateKey = new Date(event.eventDate).toISOString().split("T")[0];
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey)!.push(event);
  }

  const conflicts: VolunteerConflict[] = [];
  const conflictMap = new Map<string, VolunteerConflict>();

  // For each date with multiple events, check for double-booked volunteers
  eventsByDate.forEach((dateEvents) => {
    if (dateEvents.length < 2) return; // No overlap possible with a single event

    // Build a map of volunteer assignments across all events on this date
    const volunteerAssignments = new Map<
      string,
      { volunteerName: string; assignments: { eventId: string; eventName: string; eventDate: string; roleName: string }[] }
    >();

    for (const event of dateEvents) {
      const roles = rolesByEvent.get(event.id) || [];
      for (const role of roles) {
        if (!role.assignedVolunteerId) continue;

        if (!volunteerAssignments.has(role.assignedVolunteerId)) {
          volunteerAssignments.set(role.assignedVolunteerId, {
            volunteerName: role.assignedVolunteerName || "Unknown",
            assignments: [],
          });
        }

        volunteerAssignments.get(role.assignedVolunteerId)!.assignments.push({
          eventId: event.id,
          eventName: event.eventName,
          eventDate: event.eventDate,
          roleName: role.roleName,
        });
      }
    }

    // Flag volunteers with assignments in 2+ different events on the same date
    volunteerAssignments.forEach((data, volunteerId) => {
      const uniqueEventIds = new Set(data.assignments.map((a) => a.eventId));
      if (uniqueEventIds.size >= 2) {
        if (!conflictMap.has(volunteerId)) {
          conflictMap.set(volunteerId, {
            volunteerId,
            volunteerName: data.volunteerName,
            events: [],
          });
        }
        // Add all assignments that aren't already tracked
        const existing = conflictMap.get(volunteerId)!;
        for (const assignment of data.assignments) {
          const alreadyTracked = existing.events.some(
            (e) => e.eventId === assignment.eventId && e.roleName === assignment.roleName,
          );
          if (!alreadyTracked) {
            existing.events.push(assignment);
          }
        }
      }
    });
  });

  conflictMap.forEach((conflict) => conflicts.push(conflict));
  return conflicts;
}
