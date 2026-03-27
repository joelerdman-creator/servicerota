import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  churchId?: string;
  role?: "admin" | "volunteer" | null;
  isAdmin?: boolean;
  isHouseholdManager?: boolean;
  photoURL?: string;
  status?: "active" | "pending_approval" | "pending_invitation";
  availableRoleIds?: string[];
  availableRecurringEventSeriesIds?: string[];
  isManagedByAdmin?: boolean;
  createdAt?: Timestamp | any;
}

export interface SupportTicket {
  id?: string;
  subject: string;
  description?: string;
  submittedByUid: string;
  submittedByName?: string;
  churchId?: string | null;
  status: "Open" | "In Progress" | "Closed";
  createdAt: Timestamp | { seconds: number; nanoseconds: number } | any;
  lastActivityAt?: Timestamp | any;
}

export interface ChurchProfile {
  name: string;
  address?: string;
  calendarUrl?: string;
}

export interface ServiceTemplate {
  id: string;
  name: string;
  roleNames: string[];
}

export interface RoleTemplate {
  id: string;
  name: string;
}

    