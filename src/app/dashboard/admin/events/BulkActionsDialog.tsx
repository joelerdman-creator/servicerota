"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Loader2, Trash2, Repeat, PlusCircle, Calendar as CalendarIcon } from "lucide-react";
import { format, add, startOfDay, endOfDay } from "date-fns";
import toast from "react-hot-toast";
import {
  collection,
  writeBatch,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  getDoc,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { DateRange, DbEvent, UserProfile, ServiceTemplate, WithId } from "./types";

interface BulkActionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  firestore: Firestore;
  userProfile: UserProfile;
  templates: ServiceTemplate[] | null;
  onOpenCreateTemplate: () => void;
}

export function BulkActionsDialog({
  isOpen,
  onClose,
  firestore,
  userProfile,
  templates,
  onOpenCreateTemplate,
}: BulkActionsDialogProps) {
  const [bulkManageRange, setBulkManageRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: add(new Date(), { months: 1 }),
  });
  const [eventsToManage, setEventsToManage] = useState<WithId<DbEvent>[]>([]);
  const [isFetchingManageEvents, setIsFetchingManageEvents] = useState(false);
  const [selectedManageIds, setSelectedManageIds] = useState<Set<string>>(new Set());
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [bulkTemplateId, setBulkTemplateId] = useState<string>("");

  const reset = () => {
    setBulkManageRange({ from: new Date(), to: add(new Date(), { months: 1 }) });
    setEventsToManage([]);
    setSelectedManageIds(new Set());
    setBulkTemplateId("");
    onClose();
  };

  useEffect(() => {
    if (!isOpen || !bulkManageRange?.from || !userProfile?.churchId) {
      setEventsToManage([]);
      return;
    }
    const fetchForManage = async () => {
      setIsFetchingManageEvents(true);
      const q = query(
        collection(firestore, `churches/${userProfile.churchId}/events`),
        where("eventDate", ">=", startOfDay(bulkManageRange.from!).toISOString()),
        where("eventDate", "<=", endOfDay(bulkManageRange.to || bulkManageRange.from!).toISOString()),
        orderBy("eventDate"),
      );
      const snapshot = await getDocs(q);
      setEventsToManage(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as WithId<DbEvent>[]);
      setSelectedManageIds(new Set());
      setIsFetchingManageEvents(false);
    };
    fetchForManage();
  }, [isOpen, bulkManageRange, userProfile?.churchId, firestore]);

  const toggleAllManage = (checked: boolean) => {
    setSelectedManageIds(checked ? new Set(eventsToManage.map((e) => e.id)) : new Set());
  };

  const toggleManageId = (id: string) => {
    setSelectedManageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    if (!userProfile?.churchId || selectedManageIds.size === 0) return;
    setIsProcessingBulk(true);
    const loadingToast = toast.loading(`Deleting ${selectedManageIds.size} event(s)...`);
    const batch = writeBatch(firestore);
    selectedManageIds.forEach((id) => {
      batch.delete(doc(firestore, `churches/${userProfile.churchId}/events`, id));
    });
    try {
      await batch.commit();
      toast.success(`${selectedManageIds.size} event(s) deleted.`, { id: loadingToast });
      setShowDeleteConfirmation(false);
      reset();
    } catch (e) {
      toast.error("Failed to delete events. Check permissions.", { id: loadingToast });
      console.error(e);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!userProfile?.churchId || selectedManageIds.size === 0 || !bulkTemplateId) {
      toast.error("Please select a template and at least one event.");
      return;
    }
    setIsProcessingBulk(true);
    const loadingToast = toast.loading("Applying template...");
    try {
      const templateRef = doc(firestore, `churches/${userProfile.churchId}/service_templates`, bulkTemplateId);
      const templateSnap = await getDoc(templateRef);
      if (!templateSnap.exists()) throw new Error("Service template not found.");
      const templateRoles = (templateSnap.data()?.roles || []) as { name: string; quantity: number }[];

      const batch = writeBatch(firestore);
      const eventIds = Array.from(selectedManageIds);

      for (const eventId of eventIds) {
        const eventRef = doc(firestore, `churches/${userProfile.churchId}/events`, eventId);
        const rolesSubcollectionRef = collection(eventRef, "roles");
        const existingRolesSnap = await getDocs(rolesSubcollectionRef);
        existingRolesSnap.forEach((roleDoc) => batch.delete(roleDoc.ref));
        for (const role of templateRoles) {
          for (let i = 0; i < (role.quantity || 1); i++) {
            const newRoleRef = doc(rolesSubcollectionRef);
            batch.set(newRoleRef, { eventId, roleName: role.name, status: "Pending" });
          }
        }
      }
      await batch.commit();
      toast.success(`Template applied to ${eventIds.length} event(s).`, { id: loadingToast });
      reset();
    } catch (e: any) {
      toast.error(e.message || "An error occurred.", { id: loadingToast });
    } finally {
      setIsProcessingBulk(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && reset()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Bulk Manage Events</DialogTitle>
            <DialogDescription>
              Select a date range, then choose which events to modify or delete. These actions cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2 max-w-sm">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !bulkManageRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bulkManageRange?.from
                      ? bulkManageRange.to
                        ? <>{format(bulkManageRange.from, "LLL dd, y")} - {format(bulkManageRange.to, "LLL dd, y")}</>
                        : format(bulkManageRange.from, "LLL dd, y")
                      : <span>Pick a date range</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar initialFocus mode="range" defaultMonth={bulkManageRange?.from} selected={bulkManageRange} onSelect={setBulkManageRange} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="max-h-[50vh] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox checked={selectedManageIds.size === eventsToManage.length && eventsToManage.length > 0} onCheckedChange={(c) => toggleAllManage(Boolean(c))} />
                    </TableHead>
                    <TableHead>Event Name</TableHead>
                    <TableHead className="w-[200px]">Date &amp; Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isFetchingManageEvents && (
                    <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                  )}
                  {!isFetchingManageEvents && eventsToManage.length > 0
                    ? eventsToManage.map((event) => (
                        <TableRow key={event.id} data-state={selectedManageIds.has(event.id) && "selected"}>
                          <TableCell className="text-center"><Checkbox checked={selectedManageIds.has(event.id)} onCheckedChange={() => toggleManageId(event.id)} /></TableCell>
                          <TableCell className="font-medium flex items-center gap-2">
                            {event.seriesId && <Repeat className="h-4 w-4 text-muted-foreground" aria-label="Recurring Event" />}
                            {event.eventName}
                          </TableCell>
                          <TableCell>{format(new Date(event.eventDate), "MMM d, yyyy @ h:mm a")}</TableCell>
                        </TableRow>
                      ))
                    : !isFetchingManageEvents && (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No events found in this date range.</TableCell></TableRow>
                      )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-4 border-t pt-4">
            <div className="flex sm:justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <Label htmlFor="bulk-apply-template">Apply Template:</Label>
                <Select
                  value={bulkTemplateId}
                  onValueChange={(val) => {
                    if (val === "create_new") { onOpenCreateTemplate(); return; }
                    setBulkTemplateId(val);
                  }}
                  disabled={selectedManageIds.size === 0}
                >
                  <SelectTrigger id="bulk-apply-template" className="w-[250px]"><SelectValue placeholder="Select a template..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create_new" className="text-primary font-medium">
                      <PlusCircle className="mr-2 h-4 w-4" /> Create new template...
                    </SelectItem>
                    {templates?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleApplyTemplate} disabled={selectedManageIds.size === 0 || !bulkTemplateId || isProcessingBulk}>
                  {isProcessingBulk ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button variant="destructive" onClick={() => setShowDeleteConfirmation(true)} disabled={selectedManageIds.size === 0 || isProcessingBulk}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete {selectedManageIds.size > 0 ? `(${selectedManageIds.size})` : ""}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected {selectedManageIds.size} event(s) and all their associated roles. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingBulk}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} disabled={isProcessingBulk} className="bg-destructive hover:bg-destructive/90">
              {isProcessingBulk ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Yes, Delete Events"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
