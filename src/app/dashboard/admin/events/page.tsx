"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import EventsList from "@/components/EventsList";
import { Button } from "@/components/ui/button";
import {
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
  useCollection,
  WithId,
} from "@/firebase";
import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
} from "firebase/firestore";
import {
  PlusCircle,
  Import,
  Wand2,
  Loader2,
  Repeat,
  Edit,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardDescription, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DayPicker } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { autoAssignVolunteers } from "@/lib/scheduling/auto-assign";
import { sendScheduleNotification } from "@/ai/flows/send-notification-flow";

// --- Sub-components ---
import { ImportEventsDialog } from "./ImportEventsDialog";
import { RecurringSeriesManager } from "./RecurringSeriesManager";
import { BulkActionsDialog } from "./BulkActionsDialog";
import { CreateEventDialog } from "./CreateEventDialog";
import { EventDetailSheet } from "./EventDetailSheet";

// --- Types ---
import type {
  UserProfile,
  ChurchProfile,
  DbEvent,
  Volunteer,
  ServiceTemplate,
  Role,
  MonthAnalysis,
} from "./types";
import type { AssignmentPlan, AutoAssignInput } from "@/lib/scheduling/types";


export default function EventsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // --- Dialog visibility state (orchestrator) ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isRecurringManageOpen, setIsRecurringManageOpen] = useState(false);
  const [isBulkManageOpen, setIsBulkManageOpen] = useState(false);
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false);

  // Calendar & list state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  // Edit event state
  const [editingEvent, setEditingEvent] = useState<WithId<DbEvent> | null>(null);

  // Publish Month Dialog state
  const [isPublishMonthOpen, setIsPublishMonthOpen] = useState(false);
  const [publishMonthStatus, setPublishMonthStatus] = useState<MonthAnalysis | null>(null);
  const [publishMonthPlan, setPublishMonthPlan] = useState<AssignmentPlan | null>(null);
  const [publishMonthLoading, setPublishMonthLoading] = useState<boolean | string>(false);

  // Quick Template Creation State
  const [quickTemplateName, setQuickTemplateName] = useState("");
  const [quickTemplateRoles, setQuickTemplateRoles] = useState<{ name: string; quantity: number }[]>([]);
  const [isSavingQuickTemplate, setIsSavingQuickTemplate] = useState(false);

  // --- DATA FETCHING ---
  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const churchDocRef = useMemoFirebase(
    () =>
      firestore && userProfile?.churchId ? doc(firestore, "churches", userProfile.churchId) : null,
    [firestore, userProfile?.churchId],
  );
  const { data: churchProfile } = useDoc<ChurchProfile>(churchDocRef);

  const templatesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId) return null;
    return query(collection(firestore, `churches/${userProfile.churchId}/service_templates`));
  }, [firestore, userProfile?.churchId]);
  const { data: templates, isLoading: templatesLoading } = useCollection<ServiceTemplate>(templatesQuery);

  const volunteersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId) return null;
    return query(collection(firestore, "users"), where("churchId", "==", userProfile.churchId));
  }, [firestore, userProfile?.churchId]);
  const { data: volunteers, isLoading: volunteersLoading } = useCollection<Volunteer>(volunteersQuery);

  const roleTemplatesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId) return null;
    return query(collection(firestore, `churches/${userProfile.churchId}/role_templates`));
  }, [firestore, userProfile?.churchId]);
  const { data: roleTemplates } = useCollection<{ id: string; name: string }>(roleTemplatesQuery);

  // --- EVENTS LIST DATA ---
  const eventsInterval = useMemo(() => {
    const referenceDate = selectedDate || currentMonth;
    if (viewMode === "week") {
      return { start: startOfWeek(referenceDate), end: endOfWeek(referenceDate) };
    }
    return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
  }, [selectedDate, currentMonth, viewMode]);

  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId) return null;
    return query(
      collection(firestore, `churches/${userProfile.churchId}/events`),
      where("eventDate", ">=", eventsInterval.start.toISOString()),
      where("eventDate", "<=", eventsInterval.end.toISOString()),
      orderBy("eventDate", "asc"),
    );
  }, [firestore, userProfile, eventsInterval]);
  const { data: allEvents, isLoading: areEventsLoading } = useCollection<DbEvent>(eventsQuery);

  const filteredEventsForList = useMemo(() => {
    if (!allEvents) return [];
    if (viewMode === "month" && !selectedDate) return allEvents;
    if (selectedDate) return allEvents.filter((event) => isSameDay(new Date(event.eventDate), selectedDate));
    return allEvents;
  }, [allEvents, selectedDate, viewMode]);

  const eventDays = useMemo(
    () => new Set(allEvents?.map((e) => new Date(e.eventDate).toDateString())),
    [allEvents],
  );

  const getListTitle = () => {
    if (selectedDate) return format(selectedDate, "EEEE, MMMM do");
    if (viewMode === "week") {
      const start = startOfWeek(currentMonth);
      return `Week of ${format(start, "MMM do")}`;
    }
    return format(currentMonth, "MMMM yyyy");
  };

  const isLoading = isUserLoading || isProfileLoading;

  // --- PUBLISH MONTH HANDLERS ---
  const resetPublishMonthDialog = () => {
    setIsPublishMonthOpen(false);
    setPublishMonthStatus(null);
    setPublishMonthPlan(null);
    setPublishMonthLoading(false);
  };

  const handleAnalyzeMonth = async () => {
    if (!firestore || !userProfile?.churchId) return;
    resetPublishMonthDialog();
    setIsPublishMonthOpen(true);
    setPublishMonthLoading("Analyzing month...");
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const eventsInMonthQuery = query(
        collection(firestore, `churches/${userProfile.churchId}/events`),
        where("eventDate", ">=", monthStart.toISOString()),
        where("eventDate", "<=", monthEnd.toISOString()),
      );
      const eventsSnapshot = await getDocs(eventsInMonthQuery);
      const eventsInMonth = eventsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as WithId<DbEvent>[];

      const rolesFetchPromises = eventsInMonth.map(async (event) => {
        const rolesSnapshot = await getDocs(collection(firestore, `churches/${userProfile.churchId}/events/${event.id}/roles`));
        return rolesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<Role>));
      });
      const allRolesArrays = await Promise.all(rolesFetchPromises);
      const allRoles = allRolesArrays.flat();

      const unfilledRoles = allRoles.filter((r) => !r.assignedVolunteerId);
      const fillRate = allRoles.length > 0 ? ((allRoles.length - unfilledRoles.length) / allRoles.length) * 100 : 100;
      setPublishMonthStatus({ events: eventsInMonth, roles: allRoles, unfilledRoles, fillRate });
    } catch (e) {
      console.error(e);
      toast.error("Failed to analyze month's schedule.");
      resetPublishMonthDialog();
    } finally {
      setPublishMonthLoading(false);
    }
  };

  const handleAutoAssignMonth = async () => {
    if (!publishMonthStatus || !volunteers || !roleTemplates || !templates || !userProfile?.churchId) {
      toast.error("Missing data to run auto-assignment.");
      return;
    }
    setPublishMonthLoading("Running auto-assigner...");
    const plainVolunteers = volunteers.map((v) => {
      const plainV: any = { ...v };
      if (plainV.lastAssigned && typeof plainV.lastAssigned.toDate === "function") plainV.lastAssigned = plainV.lastAssigned.toDate().toISOString();
      if (plainV.createdAt && typeof plainV.createdAt.toDate === "function") plainV.createdAt = plainV.createdAt.toDate().toISOString();
      return plainV;
    });
    const aiInput: AutoAssignInput = {
      events: publishMonthStatus.events.map((e) => ({ id: e.id, eventName: e.eventName, eventDate: e.eventDate, churchId: e.churchId, seriesId: e.seriesId })),
      allRoles: publishMonthStatus.roles as any,
      unassignedRoles: [],
      volunteers: plainVolunteers,
      roleTemplates: roleTemplates.map((rt) => ({ id: rt.id, name: rt.name })),
      serviceTemplates: templates.map((st) => ({ id: st.id, name: st.name })),
    };
    try {
      const plan = await autoAssignVolunteers(aiInput);
      setPublishMonthPlan(plan);
    } catch (e: any) {
      toast.error(e.message || "Auto-assign failed.");
    } finally {
      setPublishMonthLoading(false);
    }
  };

  const handlePublishMonth = async (withAssignments: boolean) => {
    if (!publishMonthStatus || !firestore || !userProfile?.churchId) return;
    setPublishMonthLoading("Publishing...");
    try {
      const batch = writeBatch(firestore);

      if (withAssignments && publishMonthPlan) {
        publishMonthPlan.assignments.forEach((a) => {
          batch.update(doc(firestore, `churches/${userProfile.churchId!}/events/${a.eventId}/roles/${a.roleId}`), {
            assignedVolunteerId: a.volunteerId,
            assignedVolunteerName: a.volunteerName,
            status: "Confirmed",
          });
        });
        publishMonthPlan.userUpdates.forEach((u) => {
          batch.update(doc(firestore, "users", u.volunteerId), {
            assignmentCount: u.newAssignmentCount,
            lastAssigned: new Date(u.newLastAssigned).toISOString(),
          });
        });
      }

      publishMonthStatus.events.forEach((event) => {
        if (!event.isPublished) {
          batch.update(doc(firestore, `churches/${userProfile.churchId!}/events/${event.id}`), { isPublished: true });
        }
      });
      await batch.commit();

      // Send notifications
      const allAssignedRoles = withAssignments && publishMonthPlan
        ? publishMonthPlan.assignments.map((a) => ({ ...a }))
        : publishMonthStatus.roles.filter((r) => r.assignedVolunteerId);

      const notifications = new Map<string, { recipientName: string; assignments: any[] }>();
      const volunteerMap = new Map(volunteers?.map((v) => [v.id, v]));

      for (const assignment of allAssignedRoles) {
        // assignmentPlan entries use `volunteerId`; Role documents use `assignedVolunteerId`
        const resolvedVolunteerId =
          (assignment as any).volunteerId ?? (assignment as any).assignedVolunteerId;
        const volunteer = volunteerMap.get(resolvedVolunteerId!);
        if (!volunteer) continue;
        const recipientId = volunteer.isHouseholdManager === false && volunteer.familyId ? volunteer.familyId : volunteer.id;
        const recipient = volunteerMap.get(recipientId);
        if (recipient?.email) {
          if (!notifications.has(recipient.email)) {
            notifications.set(recipient.email, { recipientName: recipient.firstName, assignments: [] });
          }
          const event = publishMonthStatus.events.find((e) => e.id === assignment.eventId);
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

      notifications.forEach((data, email) => {
        sendScheduleNotification({
          churchId: userProfile.churchId!,
          toEmail: email,
          recipientName: data.recipientName,
          churchName: churchProfile!.name,
          eventName: `the schedule for ${format(currentMonth, "MMMM")}`,
          assignments: data.assignments,
        });
      });

      toast.success(`Published schedule for ${format(currentMonth, "MMMM")}!`);
      resetPublishMonthDialog();
    } catch (e: any) {
      toast.error(e.message || "Failed to publish month.");
      console.error(e);
      setPublishMonthLoading(false);
    }
  };

  // --- Quick Template Creation ---
  const handleCreateQuickTemplate = async () => {
    if (!quickTemplateName.trim() || !userProfile?.churchId || !firestore) {
      toast.error("Template name is required.");
      return;
    }
    if (quickTemplateRoles.length === 0) {
      toast.error("Please add at least one role to the template.");
      return;
    }
    setIsSavingQuickTemplate(true);
    const toastId = toast.loading("Creating template...");
    try {
      const templatesCol = collection(firestore, `churches/${userProfile.churchId}/service_templates`);
      await addDoc(templatesCol, {
        name: quickTemplateName.trim(),
        roles: quickTemplateRoles,
        churchId: userProfile.churchId,
        createdAt: serverTimestamp(),
      });
      toast.success("Template created successfully!", { id: toastId });
      setQuickTemplateName("");
      setQuickTemplateRoles([]);
      setIsCreateTemplateDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create template.", { id: toastId });
    } finally {
      setIsSavingQuickTemplate(false);
    }
  };

  const handleUpdateQuickTemplateRole = (roleName: string, change: number) => {
    setQuickTemplateRoles((prev) => {
      const existing = prev.find((r) => r.name === roleName);
      if (existing) {
        const newQty = Math.max(0, existing.quantity + change);
        if (newQty === 0) return prev.filter((r) => r.name !== roleName);
        return prev.map((r) => (r.name === roleName ? { ...r, quantity: newQty } : r));
      } else if (change > 0) {
        return [...prev, { name: roleName, quantity: 1 }];
      }
      return prev;
    });
  };


  // --- RENDER ---
  return (
    <div className="flex flex-col gap-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Services &amp; Events</h1>
          <p className="text-muted-foreground">Manage your church&apos;s services and events.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkManageOpen(true)} disabled={isLoading || !userProfile?.churchId}>
            <Edit className="mr-2 h-4 w-4" /> Bulk Manage
          </Button>
          <Button variant="outline" onClick={() => setIsRecurringManageOpen(true)} disabled={isLoading || !userProfile?.churchId}>
            <Repeat className="mr-2 h-4 w-4" /> Recurring
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)} disabled={isLoading || !userProfile?.churchId}>
            <Import className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} disabled={isLoading || !userProfile?.churchId}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Event
          </Button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {isLoading ? (
          <p>Loading events...</p>
        ) : userProfile?.churchId ? (
          <>
            <Card className="w-full max-w-[350px] flex-shrink-0 border-brand-accent/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Calendar</CardTitle>
                <div className="flex gap-2">
                  <Button variant={viewMode === "month" ? "default" : "outline"} size="sm" onClick={() => { setViewMode("month"); setSelectedDate(undefined); }}>Month</Button>
                  <Button variant={viewMode === "week" ? "default" : "outline"} size="sm" onClick={() => { setViewMode("week"); setSelectedDate(undefined); }}>Week</Button>
                </div>
              </CardHeader>
              <CardContent>
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  showOutsideDays
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4 w-full",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"),
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex w-full",
                    head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: cn("w-full aspect-square text-center text-sm p-0 relative [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20"),
                    day: cn(buttonVariants({ variant: "ghost" }), "h-full w-full p-1 font-normal flex flex-col justify-between"),
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible",
                  }}
                  formatters={{ formatDay: (day) => (<><div className="self-start">{format(day, "d")}</div>{eventDays.has(day.toDateString()) && <PlusCircle className="h-3 w-3 text-primary self-center" />}</>) }}
                  components={{ IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />, IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" /> }}
                />
              </CardContent>
              <CardFooter>
                <Button onClick={handleAnalyzeMonth} disabled={viewMode === "week"} className="w-full">
                  Publish {format(currentMonth, "MMMM")}
                </Button>
              </CardFooter>
            </Card>
            <EventsList
              events={filteredEventsForList}
              isLoading={areEventsLoading}
              title={getListTitle()}
              onEventClick={setEditingEvent}
            />
          </>
        ) : (
          <p className="text-destructive">Could not load events: Church ID not found.</p>
        )}
      </div>

      <Card className="w-full bg-muted/30 border-brand-accent/50 border">
        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-brand-accent/10 text-brand-accent p-4 rounded-full">
              <Wand2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Feeling Overwhelmed?</h2>
              <CardDescription className="mt-1">
                Let our AI-powered Schedule Wizard generate multiple events, create roles, and auto-assign your volunteers all in one go.
              </CardDescription>
            </div>
          </div>
          <Button asChild size="lg" className="bg-brand-accent hover:bg-brand-accent/90">
            <Link href="/dashboard/admin/schedule-wizard">Launch Schedule Wizard</Link>
          </Button>
        </div>
      </Card>

      {/* --- EXTRACTED DIALOGS --- */}
      {firestore && userProfile?.churchId && (
        <>
          <CreateEventDialog
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            firestore={firestore}
            userProfile={userProfile}
            templates={templates ?? null}
            templatesLoading={templatesLoading}
            onOpenCreateTemplate={() => setIsCreateTemplateDialogOpen(true)}
          />
          <ImportEventsDialog
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            firestore={firestore}
            userProfile={userProfile}
            defaultCalendarUrl={churchProfile?.calendarUrl}
          />
          <RecurringSeriesManager
            isOpen={isRecurringManageOpen}
            onClose={() => setIsRecurringManageOpen(false)}
            firestore={firestore}
            userProfile={userProfile}
            templates={templates ?? null}
            onOpenCreateTemplate={() => setIsCreateTemplateDialogOpen(true)}
          />
          <BulkActionsDialog
            isOpen={isBulkManageOpen}
            onClose={() => setIsBulkManageOpen(false)}
            firestore={firestore}
            userProfile={userProfile}
            templates={templates ?? null}
            onOpenCreateTemplate={() => setIsCreateTemplateDialogOpen(true)}
          />
          <EventDetailSheet
            editingEvent={editingEvent}
            onClose={() => setEditingEvent(null)}
            firestore={firestore}
            userProfile={userProfile}
            templates={templates ?? null}
            volunteers={volunteers ?? null}
            volunteersLoading={volunteersLoading}
            roleTemplates={roleTemplates ?? null}
            onOpenCreateTemplate={() => setIsCreateTemplateDialogOpen(true)}
          />
        </>
      )}

      {/* Publish Month Dialog (kept inline - tightly coupled to page calendar state) */}
      <Dialog open={isPublishMonthOpen} onOpenChange={(open) => !open && resetPublishMonthDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Publish Schedule for {format(currentMonth, "MMMM yyyy")}</DialogTitle>
          </DialogHeader>
          {publishMonthLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-muted-foreground">{typeof publishMonthLoading === "string" ? publishMonthLoading : "Loading..."}</p>
            </div>
          ) : !publishMonthStatus ? (
            <div className="text-center h-64 flex items-center justify-center">
              <p className="text-muted-foreground">Could not analyze the month&apos;s schedule.</p>
            </div>
          ) : (
            <div className="py-4 space-y-6">
              {!publishMonthPlan ? (
                <>
                  <DialogDescription>
                    Found {publishMonthStatus.events.length} event(s) with {publishMonthStatus.roles.length} total roles.
                  </DialogDescription>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label>Role Fill Rate</Label>
                      <span className="text-sm font-bold">{Math.round(publishMonthStatus.fillRate)}%</span>
                    </div>
                    <Progress value={publishMonthStatus.fillRate} />
                  </div>
                  {publishMonthStatus.unfilledRoles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Unfilled Roles ({publishMonthStatus.unfilledRoles.length})</Label>
                      <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                        <Table>
                          <TableBody>
                            {publishMonthStatus.unfilledRoles.map((role, i) => (
                              <TableRow key={`${role.id}-${i}`}>
                                <TableCell className="font-medium">{publishMonthStatus.events.find((e) => e.id === role.eventId)?.eventName}</TableCell>
                                <TableCell>{role.roleName}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{format(new Date(publishMonthStatus.events.find((e) => e.id === role.eventId)!.eventDate), "MMM d")}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <DialogDescription>The assignment logic has proposed the following assignments to fill open roles. Review the plan below.</DialogDescription>
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-blue-900 dark:text-blue-300 text-base">Assignment Reasoning</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{publishMonthPlan.reasoning}</p></CardContent>
                  </Card>
                  <div className="space-y-2">
                    <Label>Proposed Assignments ({publishMonthPlan.assignments.length})</Label>
                    <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                      <Table>
                        <TableBody>
                          {publishMonthPlan.assignments.map((a) => (
                            <TableRow key={a.roleId}>
                              <TableCell>{publishMonthStatus.events.find((e) => e.id === a.eventId)?.eventName}</TableCell>
                              <TableCell className="font-medium">{a.roleName}</TableCell>
                              <TableCell className="text-right">{a.volunteerName}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            {publishMonthPlan ? (
              <>
                <Button variant="ghost" onClick={() => setPublishMonthPlan(null)}>Back</Button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => handlePublishMonth(false)}>Publish Without Suggestions</Button>
                  <Button onClick={() => handlePublishMonth(true)}>Confirm &amp; Publish</Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={resetPublishMonthDialog}>Cancel</Button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => handlePublishMonth(false)} disabled={!!publishMonthLoading}>Publish As-Is</Button>
                  <Button onClick={handleAutoAssignMonth} disabled={!!publishMonthLoading || publishMonthStatus?.unfilledRoles.length === 0}>
                    <Wand2 className="mr-2 h-4 w-4" /> Auto-Assign &amp; Publish
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Create Template Dialog (shared across all sub-components) */}
      <Dialog open={isCreateTemplateDialogOpen} onOpenChange={setIsCreateTemplateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Service Template</DialogTitle>
            <DialogDescription>Define a reusable set of roles for your services.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-template-name">Template Name</Label>
              <Input id="quick-template-name" value={quickTemplateName} onChange={(e) => setQuickTemplateName(e.target.value)} placeholder="e.g., Sunday 10am Eucharist" />
            </div>
            <div className="space-y-2">
              <Label>Roles &amp; Quantities</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto border p-2 rounded">
                {roleTemplates?.map((role) => {
                  const roleInTemplate = quickTemplateRoles.find((r) => r.name === role.name);
                  const qty = roleInTemplate?.quantity || 0;
                  return (
                    <div key={role.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                      <Label className="font-normal">{role.name}</Label>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuickTemplateRole(role.name, -1)} disabled={qty === 0}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center text-sm">{qty}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuickTemplateRole(role.name, 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {roleTemplates?.length === 0 && (
                  <p className="text-center py-4 text-sm text-muted-foreground">No roles defined. Create roles in Settings first.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateQuickTemplate} disabled={isSavingQuickTemplate || !quickTemplateName.trim() || quickTemplateRoles.length === 0}>
              {isSavingQuickTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
