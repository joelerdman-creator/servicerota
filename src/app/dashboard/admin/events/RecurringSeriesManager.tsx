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
  Repeat,
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
  const [seriesToExtend, setSeriesToExtend] = useState<RecurringEventSeries | null>(null);
  const [isAddingSeries, setIsAddingSeries] = useState(false);
  const [newSeriesForm, setNewSeriesForm] = useState({
    name: "",
    templateId: "none",
    startDate: "",
    endDate: "",
    time: "10:00",
    isPublished: false,
    isPerpetual: false,
  });
  const [editingSeries, setEditingSeries] = useState<RecurringEventSeries | null>(null);
  const [seriesEditName, setSeriesEditName] = useState("");
  const [seriesEditTemplate, setSeriesEditTemplate] = useState<string>("");
  const [isProcessingSeriesEdit, setIsProcessingSeriesEdit] = useState(false);

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

  const handleExtendSeries = async (series: RecurringEventSeries) => {
    if (!firestore || !userProfile?.churchId) return;
    setSeriesToExtend(series);

    const lastEventQuery = query(
      collection(firestore, `churches/${userProfile.churchId}/events`),
      where("seriesId", "==", series.seriesId),
      orderBy("eventDate", "desc"),
      limit(1),
    );
    const lastEventSnap = await getDocs(lastEventQuery);
    if (lastEventSnap.empty) {
      toast.error("Could not find the original event to extend.");
      setSeriesToExtend(null);
      return;
    }
    const lastEvent = lastEventSnap.docs[0].data();
    const lastEventRolesSnap = await getDocs(collection(lastEventSnap.docs[0].ref, "roles"));
    const rolesToCopy = lastEventRolesSnap.docs.map((d) => d.data());

    const metadata = seriesMetadataMap.get(series.seriesId);
    const isPerpetual = metadata?.isPerpetual;
    let newDates: Date[] = [];

    if (isPerpetual) {
      const topUpUntil = add(new Date(), { years: 1 });
      if (series.lastEventDate >= topUpUntil) {
        toast("Series is already scheduled for at least a year out.");
        setSeriesToExtend(null);
        return;
      }
      let rule;
      if (metadata?.rruleString) {
        try {
          const { rrulestr } = await import("rrule");
          rule = rrulestr(metadata.rruleString);
        } catch {
          rule = new RRule({ freq: RRule.WEEKLY, dtstart: series.lastEventDate });
        }
      } else {
        rule = new RRule({ freq: RRule.WEEKLY, dtstart: series.lastEventDate });
      }
      newDates = rule.between(add(series.lastEventDate, { days: 1 }), topUpUntil);
    } else {
      const rule = new RRule({
        freq: RRule.WEEKLY,
        dtstart: series.lastEventDate,
        until: add(series.lastEventDate, { years: 1 }),
      });
      newDates = rule.all().slice(1);
    }

    if (newDates.length === 0) {
      toast("No new occurrences to schedule.");
      setSeriesToExtend(null);
      return;
    }

    const batch = writeBatch(firestore);
    const eventsCol = collection(firestore, `churches/${userProfile.churchId}/events`);

    newDates.forEach((date) => {
      const newEventRef = doc(eventsCol);
      batch.set(newEventRef, { ...lastEvent, eventDate: date.toISOString(), isPublished: false });
      rolesToCopy.forEach((role) => {
        const newRoleRef = doc(collection(newEventRef, "roles"));
        batch.set(newRoleRef, { eventId: newEventRef.id, roleName: role.roleName, status: "Pending" });
      });
    });

    try {
      await batch.commit();
      toast.success(`Successfully extended "${series.eventName}" by ${newDates.length} event(s).`);
      await fetchAllSeries();
    } catch (e) {
      console.error(e);
      toast.error("Failed to extend event series.");
    } finally {
      setSeriesToExtend(null);
    }
  };

  const handlePerpetualToggle = async (series: RecurringEventSeries, isPerpetualVal: boolean) => {
    if (!firestore || !userProfile?.churchId) return;
    const metadataRef = doc(firestore, `churches/${userProfile.churchId}/series_metadata`, series.seriesId);
    try {
      const currentMetadata = seriesMetadataMap.get(series.seriesId);
      const updateData: any = { seriesId: series.seriesId, isPerpetual: isPerpetualVal };
      if (isPerpetualVal && !currentMetadata?.rruleString) {
        const firstEventQuery = query(
          collection(firestore, `churches/${userProfile.churchId}/events`),
          where("seriesId", "==", series.seriesId),
          orderBy("eventDate", "asc"),
          limit(1),
        );
        const firstSnap = await getDocs(firstEventQuery);
        if (!firstSnap.empty) {
          const startDate = new Date(firstSnap.docs[0].data().eventDate);
          const rule = new RRule({ freq: RRule.WEEKLY, dtstart: startDate });
          updateData.rruleString = rule.toString();
        }
      }
      await setDoc(metadataRef, updateData, { merge: true });
      setSeriesMetadataMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(series.seriesId, { ...currentMetadata, ...updateData });
        return newMap;
      });
      toast.success(`Series set to ${isPerpetualVal ? "perpetual" : "manual"}.`);
    } catch (e) {
      console.error("Failed to update series metadata", e);
      toast.error("Could not update series setting.");
      errorEmitter.emit(
        "permission-error",
        new FirestorePermissionError({ path: metadataRef.path, operation: "write" }),
      );
    }
  };

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
      batch.set(metadataRef, { seriesId, isPerpetual: newSeriesForm.isPerpetual, rruleString: rule.toString() });

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
      setNewSeriesForm({ name: "", templateId: "none", startDate: "", endDate: "", time: "10:00", isPublished: false, isPerpetual: false });
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
              View all recurring event series in your church. Extend a series manually, or set it to &quot;Perpetual&quot; to have it top-up to one year of scheduled events.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="list" className="w-full" onValueChange={(val) => setIsAddingSeries(val === "new")}>
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
                          <TableHead>Perpetual</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allSeries.map((series) => (
                          <TableRow key={series.seriesId}>
                            <TableCell className="font-semibold">{series.eventName}</TableCell>
                            <TableCell>{series.eventCount}</TableCell>
                            <TableCell>{format(series.lastEventDate, "PP")}</TableCell>
                            <TableCell>
                              <Switch
                                checked={seriesMetadataMap.get(series.seriesId)?.isPerpetual || false}
                                onCheckedChange={(checked) => handlePerpetualToggle(series, checked)}
                                aria-label="Toggle perpetual status"
                              />
                            </TableCell>
                            <TableCell className="text-right flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingSeries(series)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleExtendSeries(series)}
                                disabled={seriesToExtend?.seriesId === series.seriesId}
                              >
                                {seriesToExtend?.seriesId === series.seriesId ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Repeat className="h-4 w-4 mr-2" />
                                    {seriesMetadataMap.get(series.seriesId)?.isPerpetual ? "Top Up" : "Extend"}
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
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
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="series-new-time">Time</Label>
                  <Input id="series-new-time" type="time" value={newSeriesForm.time} onChange={(e) => setNewSeriesForm({ ...newSeriesForm, time: e.target.value })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Perpetual Series</Label>
                    <p className="text-sm text-muted-foreground">Automatically keep events scheduled for 1 year out.</p>
                  </div>
                  <Switch checked={newSeriesForm.isPerpetual} onCheckedChange={(checked) => setNewSeriesForm({ ...newSeriesForm, isPerpetual: checked })} />
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
    </>
  );
}
