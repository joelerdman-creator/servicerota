
import { z } from "zod";

// --- SHARED EVENT & DATA EXTRACTION TYPES ---
export const ParsedEventSchema = z.object({
  eventName: z.string(),
  eventDate: z.string(), // Relaxed from .datetime() to tolerate AI output variations
  notes: z.string(),
});
export type ParsedEvent = z.infer<typeof ParsedEventSchema>;

export const VolunteerSchema = z.object({
  firstName: z.string().describe("The volunteer's first name."),
  lastName: z.string().describe("The volunteer's last name."),
  email: z.string().email().nullable().optional().describe("The volunteer's email address."),
  inferredRoleNames: z.array(z.string()).optional().describe("A list of role names this volunteer was seen performing."),
});
export type Volunteer = z.infer<typeof VolunteerSchema>;

export const RoleSchema = z.object({
  name: z.string().describe("The name of the volunteer role."),
});
export type Role = z.infer<typeof RoleSchema>;

const TemplateRoleSchema = z.object({
  name: z.string().describe("The name of the role."),
  quantity: z.number().describe("The number of volunteers needed for this role.").default(1),
});
export type TemplateRole = z.infer<typeof TemplateRoleSchema>;

export const ParsedServiceTemplateSchema = z.object({
  name: z.string().describe("The name of the service template."),
  roles: z.array(TemplateRoleSchema).describe("The list of roles and quantities in this template."),
  dayOfWeek: z.number().optional().describe("Day of the week for recurrence (0=Sun, 6=Sat)."),
  timeOfDay: z.string().optional().describe("Time of day in HH:mm format."),
});
export type ParsedServiceTemplate = z.infer<typeof ParsedServiceTemplateSchema>;


// --- NOTIFICATION TYPES ---

// Individual Notification
const BaseNotificationSchema = z.object({
  churchId: z.string().optional(), // Added for logging purposes
  toPhone: z.string().optional(),  // Volunteer's phone number (E.164 format)
  smsOptIn: z.boolean().optional(), // Whether the volunteer opted in to SMS
});

const AssignmentNotificationSchema = BaseNotificationSchema.extend({
  type: z.literal("assignment"),
  toEmail: z.string().email(),
  volunteerName: z.string(),
  eventName: z.string(),
  eventDate: z.string(), // Relaxed validation
  roleName: z.string(),
  churchName: z.string(),
});

const VolunteerInvitationSchema = BaseNotificationSchema.extend({
  type: z.literal("volunteer_invitation"),
  toEmail: z.string().email(),
  volunteerName: z.string(),
  churchName: z.string(),
  adminName: z.string(),
  claimUrl: z.string().url(),
});

const SubstitutionRequestSchema = BaseNotificationSchema.extend({
  type: z.literal("substitution_request"),
  toEmail: z.string().email(),
  recipientName: z.string(),
  requestingVolunteerName: z.string(),
  eventName: z.string(),
  eventDate: z.string(), // Relaxed validation
  roleName: z.string(),
  churchName: z.string(),
  claimUrl: z.string().url(),
});

const ApprovalConfirmationSchema = BaseNotificationSchema.extend({
  type: z.literal("approval_confirmation"),
  toEmail: z.string().email(),
  volunteerName: z.string(),
  churchName: z.string(),
  loginUrl: z.string(),
});

const SubstitutionClaimedSchema = BaseNotificationSchema.extend({
  type: z.literal("substitution_claimed"),
  toEmail: z.string().email(),
  originalVolunteerName: z.string(),
  claimedByName: z.string(),
  eventName: z.string(),
  eventDate: z.string(),
  roleName: z.string(),
  churchName: z.string(),
  loginUrl: z.string(),
});

const TradeRequestNotificationSchema = BaseNotificationSchema.extend({
  type: z.literal("trade_request"),
  toEmail: z.string().email(),
  recipientName: z.string(),
  requesterName: z.string(),
  requesterRoleName: z.string(),
  requesterEventName: z.string(),
  requesterEventDate: z.string(),
  targetRoleName: z.string(),
  targetEventName: z.string(),
  targetEventDate: z.string(),
  churchName: z.string(),
  acceptUrl: z.string(),
});

const TradeAcceptedNotificationSchema = BaseNotificationSchema.extend({
  type: z.literal("trade_accepted"),
  toEmail: z.string().email(),
  requesterName: z.string(),
  acceptedByName: z.string(),
  newRoleName: z.string(),
  newEventName: z.string(),
  newEventDate: z.string(),
  churchName: z.string(),
  loginUrl: z.string(),
});

const AvailabilityReminderSchema = BaseNotificationSchema.extend({
  type: z.literal("availability_reminder"),
  toEmail: z.string().email(),
  volunteerName: z.string(),
  churchName: z.string(),
  dueDate: z.string(), // human-readable date string e.g. "April 20, 2026"
  loginUrl: z.string(),
});

const EventReminderSchema = BaseNotificationSchema.extend({
  type: z.literal("event_reminder"),
  toEmail: z.string().email(),
  volunteerName: z.string(),
  eventName: z.string(),
  eventDate: z.string(),
  roleName: z.string(),
  churchName: z.string(),
  loginUrl: z.string(),
});

export const SendNotificationInputSchema = z.discriminatedUnion("type", [
  AssignmentNotificationSchema,
  VolunteerInvitationSchema,
  SubstitutionRequestSchema,
  ApprovalConfirmationSchema,
  SubstitutionClaimedSchema,
  TradeRequestNotificationSchema,
  TradeAcceptedNotificationSchema,
  AvailabilityReminderSchema,
  EventReminderSchema,
]);
export type SendNotificationInput = z.infer<typeof SendNotificationInputSchema>;

export const SendNotificationOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendNotificationOutput = z.infer<typeof SendNotificationOutputSchema>;

// Schedule Publication Notification
const AssignmentDetailsSchema = z.object({
  volunteerName: z.string(),
  eventName: z.string(),
  eventDate: z.string(), // Relaxed validation
  roleName: z.string(),
});

export const SendScheduleNotificationInputSchema = z.object({
  churchId: z.string().optional(),
  toEmail: z.string().email(),
  toPhone: z.string().optional(),
  smsOptIn: z.boolean().optional(),
  recipientName: z.string(),
  churchName: z.string(),
  eventName: z.string(),
  assignments: z.array(AssignmentDetailsSchema),
});
export type SendScheduleNotificationInput = z.infer<typeof SendScheduleNotificationInputSchema>;

// --- TEXT & DOCUMENT EXTRACTION TYPES ---

export const ExtractDataInputSchema = z.object({
  pastedText: z
    .string()
    .describe(
      "A block of text copied from a spreadsheet, Word document, or PDF containing lists of people or roles.",
    ),
  dataType: z.enum(["volunteers", "roles", "volunteers-and-roles"]).describe("The type of data to extract from the text."),
});
export type ExtractDataInput = z.infer<typeof ExtractDataInputSchema>;

export const ExtractDataOutputSchema = z.object({
  volunteers: z.array(VolunteerSchema).optional().describe("A list of extracted volunteers."),
  roles: z.array(RoleSchema).optional().describe("A list of extracted roles."),
  reasoning: z
    .string()
    .describe("A brief explanation of what was found and extracted from the text."),
});
export type ExtractDataOutput = z.infer<typeof ExtractDataOutputSchema>;

export const DocumentExtractionInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "A document (PDF, image, text file) encoded as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'.",
    ),
  userHint: z
    .string()
    .optional()
    .describe("An optional hint from the user about the structure or content of the document."),
  knownRoleNames: z.array(z.string()).optional().describe("An array of known role names to help with extraction."),
});
export type DocumentExtractionInput = z.infer<typeof DocumentExtractionInputSchema>;

export const DocumentExtractionOutputSchema = z.object({
  events: z
    .array(ParsedEventSchema)
    .optional()
    .describe("A list of extracted events with their name, date, and any notes."),
  volunteers: z
    .array(VolunteerSchema)
    .optional()
    .describe("A list of extracted volunteers with their first name, last name, and email."),
  roles: z.array(RoleSchema).optional().describe("A list of extracted volunteer roles."),
  serviceTemplates: z
    .array(ParsedServiceTemplateSchema)
    .optional()
    .describe("A list of extracted service templates with their name and roles."),
  reasoning: z
    .string()
    .describe("A brief explanation of what was found and extracted from the text."),
});
export type DocumentExtractionOutput = z.infer<typeof DocumentExtractionOutputSchema>;
