
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

export const SendNotificationInputSchema = z.discriminatedUnion("type", [
  AssignmentNotificationSchema,
  VolunteerInvitationSchema,
  SubstitutionRequestSchema,
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
