
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
  errorEmitter,
} from "@/firebase";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
  query,
  where,
  getDocs,
  type DocumentReference,
  orderBy,
} from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Stepper,
  StepperItem,
  useExternalStepper,
  type UseStepperReturn,
} from "@/components/ui/stepper";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Loader2, Check } from "lucide-react";
import { autoAssignVolunteers } from "@/lib/scheduling/auto-assign";
import type { AssignmentPlan, AutoAssignInput } from "@/lib/scheduling/types";
import toast from "react-hot-toast";
import Link from "next/link";
import { sendScheduleNotification } from "@/ai/flows/send-notification-flow";
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// --- TYPES ---
interface UserProfile {
  churchId?: string;
  name?: string;
}
interface ChurchProfile {
  name?: string;
}
interface DbEvent {
  id: string;
  eventName: string;
  eventDate: string;
  churchId: string;
  createdAt?: { seconds: number, nanoseconds: number } | any;
}
interface DbRole {
  id: string;
  eventId: string;
  roleName: string;
  status: "Pending" | "Unassigned" | "Open" | "Confirmed" | "Declined" | "Pending Substitution";
  assignedVolunteerId: string | null;
  assignedVolunteerName: string | null;
}
interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  availableRoleIds?: string[];
  availableServiceTemplateIds?: string[];
  assignmentCount?: number;
  lastAssigned?: any;
  unavailability?: string[];
  servingPreference?: string;
  familyId?: string;
  isHouseholdManager?: boolean;
  createdAt?: any;
}
interface RoleTemplate {
  id: string;
  name: string;
}
interface ServiceTemplate {
    id: string;
    name: string;
}

// --- WIZARD STEPS ---
const steps = [
  { label: "Select Events" },
  { label: "Auto-Assign" },
  { label: "Confirmation" },
];

export default function ScheduleWizardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const stepper = useExternalStepper({ initialStep: 0, steps });

  // Data fetching
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(
      () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
      [user, firestore],
    ),
  );
  const { data: churchProfile } = useDoc<ChurchProfile>(
    useMemoFirebase(
      () =>
        userProfile?.churchId && firestore
          ? doc(firestore, "churches", userProfile.churchId)
          : null,
      [firestore, userProfile?.churchId],
    ),
  );
  const { data: volunteers, isLoading: volunteersLoading } = useCollection<Volunteer>(
    useMemoFirebase(
      () =>
        userProfile?.churchId && firestore
          ? query(collection(firestore, "users"), where("churchId", "==", userProfile.churchId))
          : null,
      [firestore, userProfile?.churchId],
    ),
  );
  const { data: roleTemplates, isLoading: rolesLoading } = useCollection<RoleTemplate>(
    useMemoFirebase(
      () =>
        userProfile?.churchId && firestore
          ? collection(firestore, `churches/${userProfile.churchId}/role_templates`)
          : null,
      [firestore, userProfile?.churchId],
    ),
  );
  const { data: serviceTemplates, isLoading: serviceTemplatesLoading } = useCollection<ServiceTemplate>(
    useMemoFirebase(
        () => userProfile?.churchId && firestore ? query(collection(firestore, `churches/${userProfile.churchId}/service_templates`)) : null,
        [firestore, userProfile?.churchId]
    ),
  );

  // --- WIZARD STATE ---
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [fetchedEvents, setFetchedEvents] = useState<DbEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [isPublished, setIsPublished] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [assignmentPlan, setAssignmentPlan] = useState<AssignmentPlan | null>(null);
  const [finalMessage, setFinalMessage] = useState("");
  
  const [rollbackPlan, setRollbackPlan] = useState<{
    roles: { roleRef: DocumentReference }[];
    users: { userRef: DocumentReference; oldAssignmentCount: number; oldLastAssigned: any }[];
  } | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const eventsToAssign = useMemo(() => {
    return fetchedEvents.filter((event) => selectedEventIds.has(event.id));
  }, [fetchedEvents, selectedEventIds]);

  // Fetch events when dateRange changes
  useEffect(() => {
    if (!firestore || !userProfile?.churchId || !dateRange?.from || !dateRange?.to) {
      setFetchedEvents([]);
      return;
    }

    const fetchEvents = async () => {
      setIsProcessing(true);
      const eventsQuery = query(
        collection(firestore, `churches/${userProfile.churchId}/events`),
        where("eventDate", ">=", dateRange.from?.toISOString()),
        where("eventDate", "<=", dateRange.to?.toISOString()),
        orderBy("eventDate"),
      );
      const snapshot = await getDocs(eventsQuery);
      const eventsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as DbEvent[];
      setFetchedEvents(eventsData);
      setSelectedEventIds(new Set(eventsData.map((e) => e.id))); // Select all by default
      setIsProcessing(false);
    };
    fetchEvents();
  }, [firestore, userProfile?.churchId, dateRange]);

  // --- HANDLERS ---
  const handleTriggerAutoAssign = async () => {
    if (!firestore || !userProfile?.churchId || !volunteers || !roleTemplates || !serviceTemplates) {
      toast.error("Data not loaded. Cannot proceed.");
      return;
    }
    if (eventsToAssign.length === 0) {
      toast.error("Please select at least one event to assign.");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading("Finding unassigned roles...");

    try {
      const allUnassignedRoles: DbRole[] = [];
      for (const event of eventsToAssign) {
        // Fetch ALL roles for the event, then filter in memory.
        const rolesCollectionRef = collection(
          firestore, 
          `churches/${userProfile.churchId}/events/${event.id}/roles`
        );
        const snapshot = await getDocs(rolesCollectionRef);
        
        snapshot.forEach((d) => {
          const roleData = d.data() as DbRole;
          
          // ROBUST CHECK FOR UNASSIGNED STATUS
          // We consider it unassigned if:
          // 1. assignedVolunteerId is null/undefined/empty
          // 2. OR status indicates a vacancy (Unassigned, Open, Declined, Pending Substitution)
          const isEffectiveUnassigned = 
            !roleData.assignedVolunteerId || 
            roleData.assignedVolunteerId === "" ||
            roleData.status === "Unassigned" || 
            roleData.status === "Open" ||
            roleData.status === "Declined" ||
            roleData.status === "Pending Substitution";

          if (isEffectiveUnassigned) {
            // IMPORTANT: Sanitize the object we send to the AI.
            // If the status is "Declined" but there is a lingering ID, we MUST clear it
            // or the AI flow will think it's occupied.
            allUnassignedRoles.push({ 
                ...roleData,
                id: d.id, 
                assignedVolunteerId: null, // Force null
                assignedVolunteerName: null // Force null
            });
          }
        });
      }

      if (allUnassignedRoles.length === 0) {
        toast.success("All roles in the selected events are already assigned!", {
          id: loadingToast,
        });
        setIsProcessing(false);
        return;
      }

      toast.loading(`Found ${allUnassignedRoles.length} open roles. Running auto-assignment...`, { id: loadingToast });

      const mappedVolunteers = volunteers.map((v) => {
        const plainV: any = { ...v };
        if (plainV.lastAssigned && typeof plainV.lastAssigned.toDate === "function") {
          plainV.lastAssigned = plainV.lastAssigned.toDate().toISOString();
        }
        if (plainV.createdAt && typeof plainV.createdAt.toDate === "function") {
          plainV.createdAt = plainV.createdAt.toDate().toISOString();
        }
        return plainV;
      });

      const mappedEvents = eventsToAssign.map((e) => {
        const plainE: any = { ...e };
        if (plainE.createdAt && typeof plainE.createdAt.toDate === 'function') {
          plainE.createdAt = plainE.createdAt.toDate().toISOString();
        }
        return plainE;
      });

      const aiInput: AutoAssignInput = {
        events: mappedEvents,
        unassignedRoles: allUnassignedRoles,
        volunteers: mappedVolunteers,
        roleTemplates: roleTemplates.map((rt) => ({ id: rt.id, name: rt.name })),
        serviceTemplates: serviceTemplates.map((st) => ({ id: st.id, name: st.name })),
      };
      const plan = await autoAssignVolunteers(aiInput);
      setAssignmentPlan(plan);
      toast.success("Assignment Plan generated!", { id: loadingToast });

      stepper.nextStep();
    } catch (e: any) {
      console.error("Error preparing for auto-assign:", e);
      toast.error(e.message || "Failed to prepare for assignments.", { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAssignments = async () => {
    if (
      !firestore ||
      !userProfile?.churchId ||
      !assignmentPlan ||
      !volunteers ||
      !churchProfile?.name
    ) {
      toast.error("Required data for confirmation is missing.");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading("Saving final assignments and sending notifications...");

    try {
      const batch = writeBatch(firestore);
      const rollbackRoles: { roleRef: DocumentReference }[] = [];
      const rollbackUsers: { userRef: DocumentReference; oldAssignmentCount: number; oldLastAssigned: any }[] = [];

      // Update roles
      assignmentPlan.assignments.forEach((assignment) => {
        const roleRef = doc(
          firestore,
          `churches/${userProfile.churchId!}/events/${assignment.eventId}/roles`,
          assignment.roleId,
        );
        batch.update(roleRef, {
          assignedVolunteerId: assignment.volunteerId,
          assignedVolunteerName: assignment.volunteerName,
          status: "Confirmed",
        });
        rollbackRoles.push({ roleRef });
      });

      // Update user stats
      const volunteerMap = new Map(volunteers.map((v) => [v.id, v]));
      assignmentPlan.userUpdates.forEach((update) => {
        const userRef = doc(firestore, "users", update.volunteerId);
        batch.update(userRef, {
          assignmentCount: update.newAssignmentCount,
          lastAssigned: update.newLastAssigned,
        });
        const v = volunteerMap.get(update.volunteerId);
        if (v) {
          rollbackUsers.push({
            userRef,
            oldAssignmentCount: v.assignmentCount || 0,
            oldLastAssigned: v.lastAssigned || null,
          });
        }
      });
      setRollbackPlan({ roles: rollbackRoles, users: rollbackUsers });

      await batch.commit();

      // --- BATCH NOTIFICATION LOGIC ---
      if (isPublished && assignmentPlan.assignments.length > 0) {
        const notifications = new Map<string, { recipientName: string; assignments: any[] }>();

        for (const assignment of assignmentPlan.assignments) {
          const volunteer = volunteerMap.get(assignment.volunteerId);
          if (!volunteer) continue;

          const recipientId =
            volunteer.isHouseholdManager === false && volunteer.familyId
              ? volunteer.familyId
              : volunteer.id;
          const recipient = volunteerMap.get(recipientId);

          if (recipient?.email) {
            if (!notifications.has(recipient.email)) {
              notifications.set(recipient.email, {
                recipientName: recipient.firstName,
                assignments: [],
              });
            }
            const event = eventsToAssign.find((e) => e.id === assignment.eventId);
            if (event) {
              notifications.get(recipient.email)!.assignments.push({
                volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
                eventName: event.eventName,
                eventDate: event.eventDate,
                roleName: assignment.roleName,
              });
            }
          }
        }

        Array.from(notifications.entries()).forEach(([email, data]) => {
          sendScheduleNotification({
            churchId: userProfile.churchId!,
            toEmail: email,
            recipientName: data.recipientName,
            churchName: churchProfile.name || "Your Church",
            eventName: "the upcoming services", // Generic name for batch
            assignments: data.assignments,
          });
        });
        toast.success("Schedule updated and notifications sent!", { id: loadingToast });
      } else {
        toast.success("Schedule updated!", { id: loadingToast });
      }

      setFinalMessage(
        `Successfully made ${assignmentPlan.assignments.length} new assignments across ${eventsToAssign.length} events.`,
      );
      stepper.nextStep();
    } catch (e: any) {
      console.error("Error confirming assignments:", e);
      toast.error(e.message || "Failed to save assignments.", { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndoAssignments = async () => {
    if (!firestore || !rollbackPlan) return;
    setIsUndoing(true);
    const loadingToast = toast.loading("Undoing assignments...");
    try {
      const batch = writeBatch(firestore);
      rollbackPlan.roles.forEach((r) => {
        batch.update(r.roleRef, {
          assignedVolunteerId: null,
          assignedVolunteerName: null,
          status: "Pending", 
        });
      });
      rollbackPlan.users.forEach((u) => {
        batch.update(u.userRef, {
          assignmentCount: u.oldAssignmentCount,
          lastAssigned: u.oldLastAssigned,
        });
      });
      await batch.commit();
      toast.success("Assignments have been successfully rolled back.", { id: loadingToast });
      setRollbackPlan(null);
      setFinalMessage("Assignments were undone.");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to undo assignments.", { id: loadingToast });
    } finally {
      setIsUndoing(false);
    }
  };

  const startOver = () => {
    setAssignmentPlan(null);
    setFinalMessage("");
    setRollbackPlan(null);
    stepper.resetSteps();
  };

  const isLoading = isProfileLoading || volunteersLoading || rolesLoading || serviceTemplatesLoading;
  if (isLoading) return <p>Loading wizard dependencies...</p>;

  const renderStepContent = () => {
    switch (stepper.activeStep) {
      case 0:
        return (
          <WizardStep
            title="Step 1: Select Events"
            description="Choose a date range and select the events you want to auto-assign."
          >
            <SelectEventsForm
              events={fetchedEvents}
              selectedIds={selectedEventIds}
              setSelectedIds={setSelectedEventIds}
              dateRange={dateRange}
              setDateRange={setDateRange}
              isProcessing={isProcessing}
            />
          </WizardStep>
        );
      case 1:
        return (
          <WizardStep
            title="Step 2: Auto-Assign Volunteers"
            description="Review the proposed assignments based on volunteer availability and fairness rules."
          >
            <AssignmentReview plan={assignmentPlan} events={eventsToAssign} />
          </WizardStep>
        );
      case 2:
        return (
          <WizardStep
            title="Step 3: Confirmation"
            description={rollbackPlan ? "Your new schedule has been created!" : "Assignments have been rolled back."}
          >
            <ConfirmationView 
              message={finalMessage} 
              onUndo={handleUndoAssignments} 
              canUndo={!!rollbackPlan} 
              isUndoing={isUndoing} 
            />
          </WizardStep>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Auto-Assign Wizard</h1>
        <p className="text-muted-foreground">
          A step-by-step guide to automatically filling your volunteer schedule.
        </p>
      </header>
      <Card>
        <CardHeader>
          <Stepper {...stepper}>
            {steps.map((step, index) => (
              <StepperItem key={step.label} index={index} label={step.label} checkIcon={Check} />
            ))}
          </Stepper>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
        <CardFooter>
          <WizardFooter
            stepper={stepper}
            isProcessing={isProcessing}
            onNext={
              stepper.activeStep === 0 ? handleTriggerAutoAssign : handleConfirmAssignments
            }
            onStartOver={startOver}
            nextDisabled={stepper.activeStep === 0 && eventsToAssign.length === 0}
            assignmentPlan={assignmentPlan}
          />
        </CardFooter>
      </Card>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function WizardStep({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-8 space-y-6 min-h-[400px]">
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="border-t pt-6">{children}</div>
    </div>
  );
}

interface SelectEventsFormProps {
  events: DbEvent[];
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  dateRange: DateRange | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  isProcessing: boolean;
}

function SelectEventsForm({
  events,
  selectedIds,
  setSelectedIds,
  dateRange,
  setDateRange,
  isProcessing,
}: SelectEventsFormProps) {
  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(events.map((e) => e.id)));
    else setSelectedIds(new Set());
  };

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 max-w-sm">
        <Label htmlFor="date-range">Date Range</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date-range"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateRange && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="max-h-[50vh] overflow-y-auto border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-[50px] text-center">
                <Checkbox
                  checked={selectedIds.size === events.length && events.length > 0}
                  onCheckedChange={(checked) => toggleAll(!!checked)}
                />
              </TableHead>
              <TableHead>Event Name</TableHead>
              <TableHead className="w-[200px]">Date & Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isProcessing && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            )}
            {!isProcessing &&
              events.map((event) => (
                <TableRow
                  key={event.id}
                  data-state={selectedIds.has(event.id) && "selected"}
                  className="cursor-pointer"
                  onClick={() => toggleOne(event.id)}
                >
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedIds.has(event.id)}
                      onCheckedChange={() => toggleOne(event.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{event.eventName}</TableCell>
                  <TableCell>{format(new Date(event.eventDate), "MMM d, yyyy @ h:mm a")}</TableCell>
                </TableRow>
              ))}
            {!isProcessing && events.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No events found for this date range.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AssignmentReview({ plan, events }: { plan: AssignmentPlan | null; events: DbEvent[] }) {
  if (!plan)
    return (
      <p className="text-muted-foreground text-center py-8">
        Assignments will be shown here after the previous step is complete.
      </p>
    );

  const findEventDisplay = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return "Unknown Event";
    return `${event.eventName} (${format(new Date(event.eventDate), "MMM d")})`;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-300">Assignment Reasoning</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{plan.reasoning}</p>
        </CardContent>
      </Card>
      <div className="max-h-[50vh] overflow-y-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned Volunteer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.assignments.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24">
                  Could not assign any volunteers based on constraints.
                </TableCell>
              </TableRow>
            )}
            {plan.assignments.map((a) => (
              <TableRow key={a.roleId}>
                <TableCell>{findEventDisplay(a.eventId)}</TableCell>
                <TableCell className="font-medium">{a.roleName}</TableCell>
                <TableCell>{a.volunteerName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ConfirmationView({ 
  message, 
  onUndo, 
  canUndo, 
  isUndoing 
}: { 
  message: string; 
  onUndo: () => void; 
  canUndo: boolean; 
  isUndoing: boolean; 
}) {
  return (
    <div className="text-center py-16 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-primary mb-4">{canUndo ? "Success!" : "Rolled Back"}</h2>
        <p className="text-lg text-muted-foreground">{message}</p>
      </div>
      <div className="flex justify-center gap-4">
        {canUndo && (
          <Button variant="outline" onClick={onUndo} disabled={isUndoing}>
            {isUndoing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Undo Assignments
          </Button>
        )}
        <Button asChild>
          <Link href="/dashboard/admin/events">View Events</Link>
        </Button>
      </div>
    </div>
  );
}

function WizardFooter({
  stepper,
  isProcessing,
  onNext,
  onStartOver,
  nextDisabled,
  assignmentPlan,
}: {
  stepper: UseStepperReturn;
  isProcessing: boolean;
  onNext: () => void;
  onStartOver: () => void;
  nextDisabled?: boolean;
  assignmentPlan: AssignmentPlan | null;
}) {
  const { activeStep, prevStep } = stepper;

  const showNext = activeStep === 0;
  const showConfirm = activeStep === 1;
  const showStartOver = activeStep === 2;

  return (
    <div className="flex w-full justify-between items-center">
      {showStartOver ? (
        <Button onClick={onStartOver}>Schedule Another Batch</Button>
      ) : (
        <>
          <Button disabled={isProcessing || activeStep === 0} onClick={prevStep} variant="secondary">
            Back
          </Button>

          <div className="flex gap-2">
            {showNext && (
              <Button disabled={isProcessing || nextDisabled} onClick={onNext}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Next"
                )}
              </Button>
            )}
            {showConfirm && (
              <Button disabled={isProcessing || !assignmentPlan} onClick={onNext}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  `Confirm & Finalize`
                )}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
