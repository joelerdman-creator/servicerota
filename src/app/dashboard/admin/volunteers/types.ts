export interface AdminProfile {
  churchId?: string;
  name?: string;
}

export interface ChurchProfile {
  name: string;
}

export interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  availableRoleIds?: string[];
  availableRecurringEventSeriesIds?: string[];
  photoURL?: string;
  status?: "active" | "pending_approval" | "pending_invitation";
  isManagedByAdmin?: boolean;
  isAdmin?: boolean;
  role?: "admin" | "volunteer";
  familyId?: string | null;
  isHouseholdManager?: boolean;
}

export interface RecurringService {
  seriesId: string;
  eventName: string;
}
