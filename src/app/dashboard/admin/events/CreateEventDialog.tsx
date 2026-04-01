"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { format, add } from "date-fns";
import toast from "react-hot-toast";
import {
  collection,
  writeBatch,
  doc,
  serverTimestamp,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { RRule } from "rrule";
import { errorEmitter } from "@/firebase";
import { FirestorePermissionError } from "@/firebase/errors";
import { useDebounce } from "@/hooks/use-debounce";
import type { DbEvent, UserProfile, ServiceTemplate, WithId } from "./types";

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  firestore: Firestore;
  userProfile: UserProfile;
  templates: ServiceTemplate[] | null;
  templatesLoading: boolean;
  onOpenCreateTemplate: () => void;
}

export function CreateEventDialog({
  isOpen,
  onClose,
  firestore,
  userProfile,
  templates,
  templatesLoading,
  onOpenCreateTemplate,
}: CreateEventDialogProps) {
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("10:00");
  const [newEventType, setNewEventType] = useState<"Service" | "Generic Event">("Service");
  const [isPublished, setIsPublished] = useState(false);
  const [isSignupEnabled, setIsSignupEnabled] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [potentialDuplicate, setPotentialDuplicate] = useState<WithId<DbEvent> | null>(null);
  const [linkToSeries, setLinkToSeries] = useState(false);

  const debouncedEventDate = useDebounce(newEventDate, 500);
  const debouncedEventTime = useDebounce(newEventTime, 500);

  const reset = () => {
    setNewEventName("");
    setNewEventDate("");
    setNewEventTime("10:00");
    setNewEventType("Service");
    setSelectedTemplateId(null);
    setIsPublished(false);
    setIsSignupEnabled(false);
    setIsRecurring(false);
    setRecurrenceEndDate("");
    setPotentialDuplicate(null);
    setLinkToSeries(false);
    onClose();
  };

  useEffect(() => {
    const checkDuplicate = async () => {
      setPotentialDuplicate(null);
      setLinkToSeries(false);
      if (!firestore || !userProfile?.churchId || !debouncedEventDate || !debouncedEventTime) return;
      try {
        const combinedDateTime = new Date(`${debouncedEventDate}T${debouncedEventTime}`).toISOString();
        const q = query(
          collection(firestore, `churches/${userProfile.churchId}/events`),
          where("eventDate", "==", combinedDateTime),
          limit(1),
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setPotentialDuplicate({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as WithId<DbEvent>);
        }
      } catch (e) {
        console.error("Error checking for duplicate events:", e);
      }
    };
    if (isOpen) checkDuplicate();
  }, [debouncedEventDate, debouncedEventTime, firestore, userProfile?.churchId, isOpen]);

  const handleCreateEvent = async () => {
    if (!newEventName.trim() || !newEventDate || !userProfile?.churchId) {
      toast.error("Please fill out event name and start date.");
      return;
    }
    setIsCreating(true);
    const loadingToast = toast.loading("Creating event(s)...");
    try {
      const eventDates: Date[] = [];
      const combinedStartDateTime = `${newEventDate}T${newEventTime}`;

      if (isRecurring) {
        const fallbackEndDate = recurrenceEndDate || format(add(new Date(combinedStartDateTime), { years: 1 }), "yyyy-MM-dd");
        const response = await fetch("/api/generate-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: combinedStartDateTime, endDate: `${fallbackEndDate}T${newEventTime}`, freq: "WEEKLY" }),
        });
        if (!response.ok) throw new Error("Failed to generate recurring dates.");
        const dates = (await response.json()) as string[];
        eventDates.push(...dates.map((d) => new Date(d)));
      } else {
        eventDates.push(new Date(combinedStartDateTime));
      }

      const batch = writeBatch(firestore);
      const eventsCollectionRef = collection(firestore, `churches/${userProfile.churchId}/events`);
      const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);
      const seriesId = isRecurring ? doc(collection(firestore, "_")).id : null;

      if (seriesId) {
        const metadataRef = doc(firestore, `churches/${userProfile.churchId}/series_metadata`, seriesId);
        const rule = new RRule({ freq: RRule.WEEKLY, dtstart: new Date(combinedStartDateTime) });
        batch.set(metadataRef, { seriesId, endDate: recurrenceEndDate || null, rruleString: rule.toString() });
      }

      for (const date of eventDates) {
        const newEventRef = doc(eventsCollectionRef);
        const [hours, minutes] = newEventTime.split(":").map(Number);
        date.setHours(hours, minutes);

        const eventData: any = {
          eventName: newEventName.trim(),
          eventDate: date.toISOString(),
          eventType: newEventType,
          churchId: userProfile.churchId,
          createdAt: serverTimestamp(),
          isPublished,
          isSignupEnabled,
          signupScope: "unassigned_only",
        };

        if (linkToSeries && potentialDuplicate?.seriesId && !isRecurring) {
          eventData.seriesId = potentialDuplicate.seriesId;
        } else if (seriesId) {
          eventData.seriesId = seriesId;
        }

        batch.set(newEventRef, eventData);

        if (selectedTemplate?.roles?.length) {
          const rolesCollectionRef = collection(firestore, `churches/${userProfile.churchId}/events/${newEventRef.id}/roles`);
          for (const role of selectedTemplate.roles) {
            for (let i = 0; i < (role.quantity || 1); i++) {
              const newRoleRef = doc(rolesCollectionRef);
              batch.set(newRoleRef, { eventId: newEventRef.id, roleName: role.name, status: "Pending" });
            }
          }
        }
      }

      await batch.commit();
      const eventCount = eventDates.length;
      toast.success(`${eventCount} event${eventCount > 1 ? "s" : ""} created successfully!`, { id: loadingToast });
      reset();
    } catch (e: unknown) {
      console.error(e);
      toast.error((e as Error).message || "Failed to create event(s). Check permissions.", { id: loadingToast });
      if (userProfile?.churchId) {
        const permissionError = new FirestorePermissionError({
          path: `churches/${userProfile.churchId}/events`,
          operation: "create",
        });
        errorEmitter.emit("permission-error", permissionError);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && reset()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Event Type</Label>
            <Select value={newEventType} onValueChange={(v) => setNewEventType(v as any)}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Service">Service</SelectItem>
                <SelectItem value="Generic Event">Generic Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Event Name</Label>
            <Input id="name" placeholder="e.g. Sunday Service" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template">Service Template (Optional)</Label>
            <Select
              value={selectedTemplateId || "none"}
              onValueChange={(value) => {
                if (value === "create_new") { onOpenCreateTemplate(); return; }
                setSelectedTemplateId(value === "none" ? null : value);
              }}
              disabled={templatesLoading}
            >
              <SelectTrigger id="template"><SelectValue placeholder="Select a template..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (no roles will be added)</SelectItem>
                <SelectItem value="create_new" className="text-primary font-medium">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create new template...
                </SelectItem>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="recurring-switch" className="text-base">Repeat this event</Label>
              <p className="text-sm text-muted-foreground">Create a series of recurring weekly events.</p>
            </div>
            <Switch id="recurring-switch" checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">{isRecurring ? "Start Date" : "Date"}</Label>
              <Input id="date" type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} />
            </div>
            {isRecurring && (
              <div className="space-y-2 col-span-2">
                <Label htmlFor="recurrence-end-date">End Date (Optional)</Label>
                <Input id="recurrence-end-date" type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} />
                <p className="text-xs text-muted-foreground">Leave blank for an ongoing series that&apos;s automatically maintained.</p>
              </div>
            )}
          </div>
          {potentialDuplicate && (
            <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 my-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-900 dark:text-amber-200 text-base">Duplicate Event Warning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  An event named &quot;{potentialDuplicate.eventName}&quot; already exists at this exact time.
                </p>
                {potentialDuplicate.seriesId && (
                  <div className="flex items-center space-x-2 border-t border-amber-200 dark:border-amber-700 pt-3">
                    <Checkbox id="link-series" checked={linkToSeries} onCheckedChange={(c) => setLinkToSeries(Boolean(c.valueOf()))} />
                    <Label htmlFor="link-series" className="text-sm font-normal">
                      Link this new event to the &quot;{potentialDuplicate.eventName}&quot; recurring series.
                    </Label>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="publish-switch" className="text-base">Publish Event(s)</Label>
              <p className="text-sm text-muted-foreground">Make created events visible to volunteers.</p>
            </div>
            <Switch id="publish-switch" checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="signup-switch" className="text-base">Enable Self Sign-up</Label>
              <p className="text-sm text-muted-foreground">Allow volunteers to sign themselves up for open roles.</p>
            </div>
            <Switch id="signup-switch" checked={isSignupEnabled} onCheckedChange={setIsSignupEnabled} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={reset}>Cancel</Button>
          <Button onClick={handleCreateEvent} disabled={isCreating || !newEventName || !newEventDate}>
            {isCreating ? "Creating..." : potentialDuplicate ? "Create Duplicate Event(s)" : "Create Event(s)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
