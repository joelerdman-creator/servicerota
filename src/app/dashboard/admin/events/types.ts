import type { WithId } from "@/firebase";
import type { ParsedEvent } from "@/ai/flows/types";
import type { AssignmentPlan, AutoAssignInput } from "@/lib/scheduling/types";
import type { DateRange } from "react-day-picker";

export type { ParsedEvent, AssignmentPlan, AutoAssignInput, DateRange };
export type { WithId };

export interface UserProfile {
  churchId?: string;
  name?: string;
}

export interface DbEvent {
  eventName: string;
  eventDate: string;
  seriesId?: string;
  isPublished?: boolean;
  notes?: string;
  churchId: string;
  eventType?: "Service" | "Generic Event";
  isSignupEnabled?: boolean;
  signupScope?: "all_roles" | "unassigned_only";
  signupRequiresQualification?: boolean;
}

export interface ChurchProfile {
  name: string;
  calendarUrl?: string;
}

export interface Role {
  id: string;
  eventId: string;
  roleName: string;
  assignedVolunteerId: string | null;
  assignedVolunteerName: string | null;
  volunteerId?: string;
  status?: string | null;
}

export interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  availableRoleIds?: string[];
  assignmentCount?: number;
  lastAssigned?: any;
  familyId?: string;
  isHouseholdManager?: boolean;
  createdAt?: any;
}

export interface ServiceTemplate {
  id: string;
  name: string;
  roles: { name: string; quantity: number }[];
}

export interface RecurringEventSeries {
  seriesId: string;
  eventName: string;
  lastEventDate: Date;
  eventCount: number;
  lastEventId: string;
}

export interface SeriesMetadata {
  rruleString?: string;
  endDate?: string | null;  // null = indefinite, auto-maintained by cron
}

export interface MonthAnalysis {
  events: WithId<DbEvent>[];
  roles: WithId<Role>[];
  unfilledRoles: WithId<Role>[];
  fillRate: number;
}
