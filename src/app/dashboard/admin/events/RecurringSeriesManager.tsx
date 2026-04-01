"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Edit,
  Trash2,
  PlusCircle,
} from "lucide-react";
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
  orderBy,
  limit,
  getDoc,
  setDoc,
  deleteDoc,
  arrayRemove,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { RRule } from "rrule";
import { errorEmitter } from "@/firebase";
import { FirestorePermissionError } from "@/firebase/errors";
import type {
  UserProfile,
  ServiceTemplate,
  RecurringEventSeries,
  SeriesMetadata,
} from "./types";

interface RecurringSeriesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  firestore: Firestore;
  userProfile: UserProfile;
  templates: ServiceTemplate[] | null;
  onOpenCreateTemplate: () => void;
}

export function RecurringSeriesManager({
  isOpen,
  onClose,
  firestore,
  userProfile,
  templates,
  onOpenCreateTemplate,
}: RecurringSeriesManagerProps) {
  const [allSeries, setAllSeries] = useState<RecurringEventSeries[]>([]);
  const [seriesMetadataMap, setSeriesMetadataMap] = useState<Map<string, SeriesMetadata>>(new Map());
  const [isFetchingSeries, setIsFetchingSeries] = useState(false);
  const [isProcessingSeriesEdit, setIsProcessingSeriesEdit] = useState(false);
  const [newSeriesForm, setNewSeriesForm] = useState({
    name: "",
    templateId: "none",
    startDate: "",
    endDate: "",
    time: "10:00",
    isPublished: false,
  });
  const [editingSeries, setEditingSeries] = useState<RecurringEventSeries | null>(null);
  const [seriesEditName, setSeriesEditName] = useState("");
  const [seriesEditTemplate, setSeriesEditTemplate] = useState<string>("");
  const [seriesToDelete, setSeriesToDelete] = useState<RecurringEventSeries | null>(null);
  const [futureEventCount, setFutureEventCount] = useState(0);
  const [isDeletingSeries, setIsDeletingSeries] = useState(false);

  const fetchAllSeries = useCallback(async () => {
    if (!firestore || !userProfile?.churchId) return;
    setIsFetchingSeries(true);

    const seriesQuery = query(
      collection(firestore, `churches/${userProfile.churchId}/events`),
      where("seriesId", "!=", null),
    );
    const querySnapshot = await getDocs(seriesQuery);
    const seriesMap = new Map<string, { eventName: string; lastDate: Date; count: number; lastEventId: string }>();

    querySnapshot.forEach((d) => {
      const event = d.data() as { seriesId: string; eventDate: string; eventName: string };
      const eventDate = new Date(event.eventDate);
      const existing = seriesMap.get(event.seriesId);

      if (!existing) {
        seriesMap.set(event.seriesId, { eventName: event.eventName, lastDate: eventDate, count: 1, lastEventId: d.id });
      } else {
        existing.count++;
        if (eventDate > existing.lastDate) {
          existing.lastDate = eventDate;
          existing.eventName = event.eventName;
          existing.lastEventId = d.id;
        }
      }
    });

    const allFoundSeries: RecurringEventSeries[] = Array.from(seriesMap, ([seriesId, details]) => ({
      seriesId,
      eventName: details.eventName,
      lastEventDate: details.lastDate,
      eventCount: details.count,
      lastEventId: details.lastEventId,
    }));

    setAllSeries(allFoundSeries.sort((a, b) => a.eventName.localeCompare(b.eventName)));

    if (allFoundSeries.length > 0) {
      const metadataQuery = query(collection(firestore, `churches/${userProfile.churchId}/series_metadata`));
      const metadataSnapshot = await getDocs(metadataQuery);
      const metaMap = new Map<string, SeriesMetadata>();
      metadataSnapshot.forEach((d) => metaMap.set(d.id, d.data() as SeriesMetadata));
      setSeriesMetadataMap(metaMap);
    }

    setIsFetchingSeries(false);
  }, [firestore, userProfile?.churchId]);

  useEffect(() => {
    if (isOpen) fetchAllSeries();
  }, [isOpen, fetchAllSeries]);

  useEffect(() => {
    if (editingSeries) {
      setSeriesEditName(editingSeries.eventName);
      setSeriesEditTemplate("");
    }
  }, [editingSeries]);

  // --- DELETE SERIES (future events only) ---
  const handlePrepareDeleteSeries = async (series: RecurringEventSeries) => {
    if (!firestore || !userProfile?.churchId) return;
    setSeriesToDelete(series);

    // Count future events for the confirmation dialog
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureEventsQuery = query(
      collection(firestore, `churches/${userProfile.churchId}/events`),
      where("seriesId", "==", series.seriesId),
      where("eventDate", ">=", today.toISOString()),
    );
    const futureEventsSnap = await getDocs(futureEventsQuery);
    setFutureEventCount(futureEventsSnap.size);
  };

  const handleConfirmDeleteSeries = async () => {
    if (!seriesToDelete || !firestore || !userProfile?.churchId) return;
    setIsDeletingSeries(true);
    const toastId = toast.loading(`Deleting future events for "${seriesToDelete.eventName}"...`);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Find all future events in this series
      const futureEventsQuery = query(
        collection(firestore, `churches/${userProfile.churchId}/events`),
        where("seriesId", "==", seriesToDelete.seriesId),
        where("eventDate", ">=", today.toISOString()),
      );
      const futureEventsSnap = await getDocs(futureEventsQuery);

      // 2. Batch delete future events and their roles subcollections
      // Firestore batch limit is 500 ops, so we may need multiple batches
      let batch = writeBatch(firestore);
      let opCount = 0;
      const BATCH_LIMIT = 450; // leave some headroom

      for (const eventDoc of futureEventsSnap.docs) {
        // Delete roles subcollection docs
        const rolesSnap = await getDocs(collection(eventDoc.ref, "roles"));
        for (const roleDoc of rolesSnap.docs) {
          batch.delete(roleDoc.ref);
          opCount++;
          if (opCount >= BATCH_LIMIT) {
            await batch.commit();
            batch = writeBatch(firestore);
            opCount = 0;
          }
        }
        // Delete event doc
        batch.delete(eventDoc.ref);
        opCount++;
        if (opCount >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(firestore);
          opCount = 0;
        }
      }

      // 3. Delete series_metadata doc
      const metadataRef = doc(firestore, `churches/${userProfile.churchId}/series_metadata`, seriesToDelete.seriesId);
      batch.delete(metadataRef);
      opCount++;

      // Commit remaining ops
      if (opCount > 0) {
        await batch.commit();
      }

      // 4. Clean up volunteer preferences (availableRecurringEventSeriesIds)
      const volunteersQuery = query(
        collection(firestore, `churches/${userProfile.churchId}/volunteers`),
        where("availableRecurringEventSeriesIds", "array-contains", seriesToDelete.seriesId),
      );
      const volunteersSnap = await getDocs(volunteersQuery);

      if (!volunteersSnap.empty) {
        const volunteerBatch = writeBatch(firestore);
        volunteersSnap.forEach((volunteerDoc) => {
          volunteerBatch.update(volunteerDoc.ref, {
            availableRecurringEventSeriesIds: arrayRemove(seriesToDelete!.seriesId),
          });
        });
        await volunteerBatch.commit();
      }

      toast.success(
        `Deleted ${futureEventsSnap.size} future event(s) for "${seriesToDelete.eventName}". Past events preserved.`,
        { id: toastId }
      );
      setSeriesToDelete(null);
      await fetchAllSeries();
    } catch (e: any) {
      console.error("Failed to delete series:", e);
      toast.error(`Failed to delete series: ${e.message}`, { id: toastId });
      errorEmitter.emit(
        "permission-error",
        new FirestorePermissionError({
          path: `churches/${userProfile.churchId}/events`,
          operation: "delete",
        }),
      );
    } finally {
      setIsDeletingSeries(false);
    }
  };

  // --- RENAME SERIES ---
  const handleSeriesRename = async () => {
    if (!editingSeries || !seriesEditName.trim() || !userProfile?.churchId) {
      toast.error("Series name cannot be empty.");
      return;
    }
    setIsProcessingSeriesEdit(true);
    const toastId = toast.loading("Renaming all events in series...");
    try {
      const eventsQuery = query(
        collection(firestore, `churches/${userProfile.churchId}/events`),
        where("seriesId", "==", editingSeries.seriesId),
      );
      const qs = await getDocs(eventsQuery);
      if (qs.empty) throw new Error("No events found in this series to rename.");
      const batch = writeBatch(firestore);
      qs.forEach((eventDoc) => batch.update(eventDoc.ref, { eventName: seriesEditName.trim() }));
      await batch.commit();
      toast.success(`Renamed ${qs.size} event(s) in the series.`, { id: toastId });
      setEditingSeries(null);
      await fetchAllSeries();
    } catch (e: any) {
      toast.error(`Failed to rename series: ${e.message}`, { id: toastId });
    } finally {
      setIsProcessingSeriesEdit(false);
    }
  };

  // --- APPLY TEMPLATE ---
  const handleSeriesApplyTemplate = async () => {
    if (!editingSeries || !seriesEditTemplate || !userProfile?.churchId) {
      toast.error("Please select a template to apply.");
      return;
    }
    setIsProcessingSeriesEdit(true);
    const toastId = toast.loading("Applying template to all events in series...");
    try {
      const templateRef = doc(firestore, `churches/${userProfile.churchId}/service_templates`, seriesEditTemplate);
      const templateSnap = await getDoc(templateRef);
      if (!templateSnap.exists()) throw new Error("Service template not found.");
      const templateRoles = (templateSnap.data()?.roles || []) as { name: string; quantity: number }[];

      const eventsQuery = query(
        collection(firestore, `churches/${userProfile.churchId}/events`),
        where("seriesId", "==", editingSeries.seriesId),
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      if (eventsSnapshot.empty) throw new Error("No events found in this series to update.");

      const batch = writeBatch(firestore);
      const rolesPromises = eventsSnapshot.docs.map(async (eventDoc) => {
        const rolesSubcollectionRef = collection(eventDoc.ref, "roles");
        const existingRolesSnap = await getDocs(rolesSubcollectionRef);
        return { eventDoc, existingRolesSnap, rolesSubcollectionRef };
      });
      const rolesResults = await Promise.all(rolesPromises);

      for (const { eventDoc, existingRolesSnap, rolesSubcollectionRef } of rolesResults) {
        existingRolesSnap.forEach((roleDoc) => batch.delete(roleDoc.ref));
        for (const role of templateRoles) {
          for (let i = 0; i < (role.quantity || 1); i++) {
            const newRoleRef = doc(rolesSubcollectionRef);
            batch.set(newRoleRef, { eventId: eventDoc.id, roleName: role.name, status: "Pending" });
          }
        }
      }
      await batch.commit();
      toast.success(`Template applied to ${eventsSnapshot.size} event(s).`, { id: toastId });
      setEditingSeries(null);
    } catch (e: any) {
      toast.error(`Failed to apply template: ${e.message}`, { id: toastId });
    } finally {
      setIsProcessingSeriesEdit(false);
    }
  };

  // --- CREATE NEW SERIES ---
  const handleCreateSeriesFromModal = async () => {
    if (!newSeriesForm.name.trim() || !newSeriesForm.startDate || !userProfile?.churchId) {
      toast.error("Please fill in the name and start date.");
      return;
    }
    setIsProcessingSeriesEdit(true);
    const loadingToast = toast.loading("Creating recurring series...");
    try {
      const combinedStartDateTime = `${newSeriesForm.startDate}T${newSeriesForm.time}`;
      const fallbackEndDate = newSeriesForm.endDate || format(add(new Date(combinedStartDateTime), { years: 1 }), "yyyy-MM-dd");
      const combinedEndDateTime = `${fallbackEndDate}T${newSeriesForm.time}`;

      const response = await fetch("/api/generate-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: combinedStartDateTime, endDate: combinedEndDateTime, freq: "WEEKLY" }),
      });
      if (!response.ok) throw new Error("Failed to generate dates.");
      const dates = (await response.json()) as string[];

      const batch = writeBatch(firestore);
      const seriesId = doc(collection(firestore, "_")).id;
      const eventsCol = collection(firestore, `churches/${userProfile.churchId}/events`);
      const metadataRef = doc(firestore, `churches/${userProfile.churchId}/series_metadata`, seriesId);
      const rule = new RRule({ freq: RRule.WEEKLY, dtstart: new Date(combinedStartDateTime) });

      // Store endDate: null for ongoing series, or the end date string for finite series
      const endDateValue = newSeriesForm.endDate ? newSeriesForm.endDate : null;
      batch.set(metadataRef, { seriesId, endDate: endDateValue, rruleString: rule.toString() });

      const selectedTemplate = templates?.find((t) => t.id === newSeriesForm.templateId);

      for (const dateIso of dates) {
        const newEventRef = doc(eventsCol);
        batch.set(newEventRef, {
          eventName: newSeriesForm.name.trim(),
          eventDate: dateIso,
          eventType: "Service",
          churchId: userProfile.churchId,
          seriesId,
          isPublished: newSeriesForm.isPublished,
          createdAt: serverTimestamp(),
        });
        if (selectedTemplate?.roles?.length) {
          const rolesCol = collection(newEventRef, "roles");
          for (const role of selectedTemplate.roles) {
            for (let i = 0; i < (role.quantity || 1); i++) {
              batch.set(doc(rolesCol), { eventId: newEventRef.id, roleName: role.name, status: "Pending" });
            }
          }
        }
      }

      await batch.commit();
      toast.success(`Successfully created "${newSeriesForm.name}" with ${dates.length} events.`, { id: loadingToast });
      setNewSeriesForm({ name: "", templateId: "none", startDate: "", endDate: "", time: "10:00", isPublished: false });
      await fetchAllSeries();
    } catch (e: any) {
      toast.error(e.message || "Failed to create series.", { id: loadingToast });
    } finally {
      setIsProcessingSeriesEdit(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Recurring Events</DialogTitle>
            <DialogDescription>
              View and manage your recurring event series. Series without an end date are automatically kept scheduled one year ahead.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="list">Existing Series</TabsTrigger>
              <TabsTrigger value="new">Create New Series</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <div className="py-4">
                {isFetchingSeries ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : allSeries.length === 0 ? (
                  <p className="text-center text-muted-foreground p-8">No recurring event series found.</p>
                ) : (
                  <div className="max-h-96 overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Series Name</TableHead>
                          <TableHead>Events</TableHead>
                          <TableHead>Last Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allSeries.map((series) => {
                          const metadata = seriesMetadataMap.get(series.seriesId);
                          const isOngoing = !metadata?.endDate;
                          return (
                            <TableRow key={series.seriesId}>
                              <TableCell className="font-semibold">{series.eventName}</TableCell>
                              <TableCell>{series.eventCount}</TableCell>
                              <TableCell>{format(series.lastEventDate, "PP")}</TableCell>
                              <TableCell>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${isOngoing ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}`}>
                                  {isOngoing ? "Ongoing" : "Ends " + format(new Date(metadata!.endDate!), "PP")}
                                </span>
                              </TableCell>
                              <TableCell className="text-right flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => setEditingSeries(series)}>
                                  <Edit className="h-4 w-4 mr-2" /> Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handlePrepareDeleteSeries(series)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="new">
              <div className="space-y-4 py-4 max-w-2xl mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="series-new-name">Series Name</Label>
                  <input
                    id="series-new-name"
                    placeholder="e.g., Sunday 10am Eucharist"
                    value={newSeriesForm.name}
                    onChange={(e) => setNewSeriesForm({ ...newSeriesForm, name: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="series-new-template">Role Template</Label>
                  <Select
                    value={newSeriesForm.templateId}
                    onValueChange={(v) => {
                      if (v === "create_new") { onOpenCreateTemplate(); return; }
                      setNewSeriesForm({ ...newSeriesForm, templateId: v });
                    }}
                  >
                    <SelectTrigger id="series-new-template"><SelectValue placeholder="Select a template..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Empty roles)</SelectItem>
                      <SelectItem value="create_new" className="text-primary font-medium">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create new template...
                      </SelectItem>
                      {templates?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="series-new-start">Start Date</Label>
                    <Input id="series-new-start" type="date" value={newSeriesForm.startDate} onChange={(e) => setNewSeriesForm({ ...newSeriesForm, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="series-new-end">End Date (Optional)</Label>
                    <Input id="series-new-end" type="date" value={newSeriesForm.endDate} onChange={(e) => setNewSeriesForm({ ...newSeriesForm, endDate: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Leave blank for an ongoing series that&apos;s automatically maintained.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="series-new-time">Time</Label>
                  <Input id="series-new-time" type="time" value={newSeriesForm.time} onChange={(e) => setNewSeriesForm({ ...newSeriesForm, time: e.target.value })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Publish Immediately</Label>
                    <p className="text-sm text-muted-foreground">Make all generated events visible to volunteers.</p>
                  </div>
                  <Switch checked={newSeriesForm.isPublished} onCheckedChange={(checked) => setNewSeriesForm({ ...newSeriesForm, isPublished: checked })} />
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCreateSeriesFromModal}
                  disabled={isProcessingSeriesEdit || !newSeriesForm.name.trim() || !newSeriesForm.startDate}
                >
                  {isProcessingSeriesEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Generate Series
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => onClose()}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Series Dialog */}
      <Dialog open={!!editingSeries} onOpenChange={(open) => !open && setEditingSeries(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit: {editingSeries?.eventName}</DialogTitle>
            <DialogDescription>Apply changes to all events in this series.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="series-edit-name">Rename Series</Label>
              <div className="flex gap-2">
                <Input id="series-edit-name" value={seriesEditName} onChange={(e) => setSeriesEditName(e.target.value)} />
                <Button onClick={handleSeriesRename} disabled={isProcessingSeriesEdit || seriesEditName === editingSeries?.eventName}>Rename</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="series-edit-template">Apply New Role Template</Label>
              <div className="flex gap-2">
                <Select
                  value={seriesEditTemplate}
                  onValueChange={(val) => {
                    if (val === "create_new") { onOpenCreateTemplate(); return; }
                    setSeriesEditTemplate(val);
                  }}
                >
                  <SelectTrigger id="series-edit-template"><SelectValue placeholder="Select a template..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create_new" className="text-primary font-medium">
                      <PlusCircle className="mr-2 h-4 w-4" /> Create new template...
                    </SelectItem>
                    {templates?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleSeriesApplyTemplate} disabled={isProcessingSeriesEdit || !seriesEditTemplate}>Apply</Button>
              </div>
              <p className="text-xs text-muted-foreground">This will replace all roles for all events in this series.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingSeries(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Series Confirmation */}
      <AlertDialog open={!!seriesToDelete} onOpenChange={(open) => !open && setSeriesToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{seriesToDelete?.eventName}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {futureEventCount} future event{futureEventCount !== 1 ? "s" : ""} and their
              roles. Past events will be preserved for historical records. Volunteer preferences for this series will
              also be cleaned up. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSeries}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteSeries}
              disabled={isDeletingSeries}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingSeries ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Future Events
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
