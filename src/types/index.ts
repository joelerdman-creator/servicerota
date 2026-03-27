/**
 * Shared TypeScript interfaces used across the Parish Scribe application.
 * Centralizes type definitions to avoid duplication across page components.
 */

// --- User / Profile Types ---

export interface UserProfile {
  churchId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  photoURL?: string;
  displayName?: string;
  role?: "admin" | "volunteer";
  status?: "active" | "pending_approval" | "pending_invitation";
  isAdmin?: boolean;
  isManagedByAdmin?: boolean;
  familyId?: string;
  isHouseholdManager?: boolean;
  availableRoleIds?: string[];
  availableRecurringEventSeriesIds?: string[];
  assignmentCount?: number;
  lastAssigned?: any;
  unavailability?: string[];
  servingPreference?: string;
  createdAt?: any;
}

export interface ChurchProfile {
  name?: string;
  calendarUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  denomination?: string;
  address?: string;
}

// --- Event Types ---

export interface Event {
  eventName: string;
  eventDate: string; // ISO string
  notes?: string;
  churchId: string;
  isPublished?: boolean;
  eventType?: "Service" | "Generic Event";
  isSignupEnabled?: boolean;
  signupScope?: "all_roles" | "unassigned_only";
  signupRequiresQualification?: boolean;
  seriesId?: string;
  createdAt?: { seconds: number; nanoseconds: number } | any;
}

// --- Role Types ---

export interface Role {
  roleName: string;
  eventId: string;
  assignedVolunteerId: string | null;
  assignedVolunteerName: string | null;
  status?: "Pending" | "Unassigned" | "Open" | "Confirmed" | "Declined" | "Pending Substitution";
  volunteerId?: string;
}

export interface RoleTemplate {
  id: string;
  name: string;
}

export interface ServiceTemplate {
  id: string;
  name: string;
}

// --- Volunteer Types ---

export interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  photoURL?: string;
  availableRoleIds?: string[];
  availableRecurringEventSeriesIds?: string[];
  assignmentCount?: number;
  lastAssigned?: any;
  unavailability?: string[];
  servingPreference?: string;
  familyId?: string;
  isHouseholdManager?: boolean;
  isAdmin?: boolean;
  role?: "admin" | "volunteer";
  status?: "active" | "pending_approval" | "pending_invitation";
  isManagedByAdmin?: boolean;
  createdAt?: any;
}

// --- Notification Types ---

export interface NotificationLog {
  recipientEmail: string;
  subject: string;
  sentAt: { seconds: number; nanoseconds: number } | any;
  status: "Sent" | "Failed";
  type: string;
}
