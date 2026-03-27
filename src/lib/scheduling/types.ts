
import { z } from "zod";

export const EventForAssignmentSchema = z.object({
  id: z.string(),
  eventName: z.string(),
  eventDate: z.string(),
  churchId: z.string(),
  seriesId: z.string().optional(),
  isPublished: z.boolean().optional(),
  createdAt: z.any().optional(),
});

export const RoleForAssignmentSchema = z.object({
  id: z.string(),
  roleName: z.string(),
  eventId: z.string(),
  assignedVolunteerId: z.string().nullable(),
  assignedVolunteerName: z.string().nullable(),
  status: z.string().optional(),
});

export const VolunteerForAssignmentSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  availableRoleIds: z.array(z.string()).optional(),
  availableRecurringEventSeriesIds: z.array(z.string()).optional(),
  assignmentCount: z.number().optional().default(0),
  lastAssigned: z.string().optional(),
  unavailability: z.array(z.string()).optional(),
  servingPreference: z.string().optional(),
  familyId: z.string().optional(),
});

export const AutoAssignInputSchema = z.object({
  event: EventForAssignmentSchema.optional().describe(
    "A single event to assign volunteers for. Used for single-event assignment.",
  ),
  events: z
    .array(EventForAssignmentSchema)
    .optional()
    .describe("A batch of events to assign volunteers for. Used for wizards."),
  unassignedRoles: z
    .array(RoleForAssignmentSchema)
    .optional()
    .describe("DEPRECATED: Use allRoles instead. Will be removed in a future version."),
  allRoles: z
    .array(RoleForAssignmentSchema)
    .optional()
    .describe("The complete list of roles for the event(s) being assigned."),
  volunteers: z.array(VolunteerForAssignmentSchema).describe("The pool of available volunteers."),
  roleTemplates: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .describe("A list of all possible role templates for role compatibility checks."),
  serviceTemplates: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional()
    .describe("DEPRECATED: No longer used by the scheduling engine. Will be removed in a future version."),
});
export type AutoAssignInput = z.infer<typeof AutoAssignInputSchema>;

const AssignmentSchema = z.object({
  roleId: z.string(),
  eventId: z.string(),
  roleName: z.string(),
  volunteerId: z.string(),
  volunteerName: z.string(),
});

const UserUpdateSchema = z.object({
  volunteerId: z.string(),
  newAssignmentCount: z.number(),
  newLastAssigned: z.string(),
});

export const AssignmentPlanSchema = z.object({
  assignments: z.array(AssignmentSchema),
  userUpdates: z.array(UserUpdateSchema),
  reasoning: z
    .string()
    .describe(
      "A brief explanation of why these assignments were made, summarizing the overall strategy.",
    ),
});
export type AssignmentPlan = z.infer<typeof AssignmentPlanSchema>;

    