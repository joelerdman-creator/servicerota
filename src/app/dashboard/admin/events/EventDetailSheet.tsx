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
  AlertDialogTrigger,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, Wand2, Repeat, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  collection,
  writeBatch,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { useCollection, useMemoFirebase, WithId } from "@/firebase";
import { autoAssignVolunteers } from "@/lib/scheduling/auto-assign";
import { VolunteerCombobox } from "@/components/VolunteerCombobox";
import { sendNotification } from "@/ai/flows/send-notification-flow";
import type {
  DbEvent,
  UserProfile,
  ServiceTemplate,
  Volunteer,
  Role,
  AssignmentPlan,
  AutoAssignInput,
} from "./types";

interface EventDetailSheetProps {
  editingEvent: WithId<DbEvent> | null;
  onClose: () => void;
  firestore: Firestore;
  userProfile: UserProfile;
  templates: ServiceTemplate[] | null;
  volunteers: WithId<Volunteer>[] | null;
  volunteersLoading: boolean;
  roleTemplates: WithId<{ id: string; name: string }>[] | null;
  onOpenCreateTemplate: () => void;
  churchName?: string;
}

export function EventDetailSheet({
  editingEvent,
  onClose,
  firestore,
  userProfile,
  templates,
  volunteers,
  volunteersLoading,
  roleTemplates,
  onOpenCreateTemplate,
  churchName,
}: EventDetailSheetProps) {
  const [editForm, setEditForm] = useState({
    eventName: "",
    eventType: "Service" as "Service" | "Generic Event",
    eventDate: "",
    eventTime: "",
    notes: "",
    isPublished: false,
    isSignupEnabled: false,
    signupScope: "unassigned_only",
    signupRequiresQualification: true,
  });
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [stagedUpdateData, setStagedUpdateData] = useState<Partial<DbEvent> | null>(null);
  const [isSeriesUpdateDialogOpen, setIsSeriesUpdateDialogOpen] = useState(false);
  const [updateScope, setUpdateScope] = useState<"one" | "future" | "all">("one");
  const [newRoleForEvent, setNewRoleForEvent] = useState("");
  const [editSelectedTemplateId, setEditSelectedTemplateId] = useState<string | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [singleEventAssignmentPlan, setSingleEventAssignmentPlan] = useState<AssignmentPlan | null>(null);
  const [oneTimeVolunteerRole, setOneTimeVolunteerRole] = useState<string | null>(null);
  const [oneTimeVolunteerName, setOneTimeVolunteerName] = useState("");
  const [conflictWarning, setConflictWarning] = useState<{
    volunteer: WithId<Volunteer>;
    roleId: string;
    conflictingRoleName: string;
  } | null>(null);

  // Roles query for editing modal
  const eventRolesQuery = useMemoFirebase(
    () => {
      if (!firestore || !userProfile?.churchId || !editingEvent) return null;
      return query(
        collection(firestore, `churches/${userProfile.churchId}/events/${editingEvent.id}/roles`),
        orderBy("roleName"),
      );
    },
    [firestore, userProfile?.churchId, editingEvent],
  );
  const { data: eventRoles, isLoading: areEventRolesLoading } = useCollection<Role>(eventRolesQuery);

  // Populate edit form when an event is selected
  useEffect(() => {
    if (editingEvent) {
      const date = new Date(editingEvent.eventDate);
      setEditForm({
        eventName: editingEvent.eventName,
        eventType: editingEvent.eventType || "Service",
        eventDate: format(date, "yyyy-MM-dd"),
        eventTime: format(date, "HH:mm"),
        notes: editingEvent.notes || "",
        isPublished: editingEvent.isPublished || false,
        isSignupEnabled: editingEvent.isSignupEnabled || false,
        signupScope: editingEvent.signupScope || "unassigned_only",
        signupRequiresQualification: editingEvent.signupRequiresQualification ?? true,
      });
      setEditSelectedTemplateId(null);
    }
  }, [editingEvent]);

  const handleSaveEventDetails = async () => {
    if (!editingEvent || !userProfile?.churchId) return;
    const combinedDateTime = new Date(`${editForm.eventDate}T${editForm.eventTime}`);
    const updateData: Partial<DbEvent> = {
      eventName: editForm.eventName,
      eventType: editForm.eventType,
      eventDate: combinedDateTime.toISOString(),
      notes: editForm.notes,
      isPublished: editForm.isPublished,
      isSignupEnabled: editForm.isSignupEnabled,
      signupScope: editForm.signupScope as any,
      signupRequiresQualification: editForm.signupRequiresQualification,
    };

    const hasChanged = Object.keys(updateData).some((key) => {
      const formKey = key as keyof typeof editForm;
      if (formKey === "eventDate" || formKey === "eventTime") {
        return new Date(editingEvent.eventDate).toISOString() !== updateData.eventDate;
      }
      return updateData[formKey as keyof DbEvent] !== editingEvent[formKey as keyof DbEvent];
    });

    if (editingEvent.seriesId && hasChanged) {
      setStagedUpdateData(updateData);
      setIsSeriesUpdateDialogOpen(true);
    } else if (hasChanged) {
      const eventRef = doc(firestore, `churches/${userProfile.churchId}/events`, editingEvent.id);
      await updateDoc(eventRef, updateData);
      toast.success("Event updated.");
      onClose();
    } else {
      onClose();
    }
  };

  const handleConfirmSeriesUpdate = async () => {
    if (!stagedUpdateData || !editingEvent?.seriesId || !userProfile?.churchId) {
      toast.error("Could not complete series update: missing data.");
      return;
    }
    const loadingToast = toast.loading(`Updating ${updateScope} events...`);
    try {
      const eventsQuery = query(
        collection(firestore, `churches/${userProfile.churchId}/events`),
        where("seriesId", "==", editingEvent.seriesId),
      );
      const eventsToUpdateSnap = await getDocs(eventsQuery);
      let docsToUpdate = eventsToUpdateSnap.docs;

      if (updateScope === "future") {
        const currentEventDate = new Date(editingEvent.eventDate);
        docsToUpdate = eventsToUpdateSnap.docs.filter((d) => new Date(d.data().eventDate) >= currentEventDate);
      } else if (updateScope === "one") {
        docsToUpdate = eventsToUpdateSnap.docs.filter((d) => d.id === editingEvent.id);
      }

      if (docsToUpdate.length === 0) throw new Error("No events found to update for the selected scope.");

      const batch = writeBatch(firestore);
      docsToUpdate.forEach((d) => batch.update(d.ref, stagedUpdateData));
      await batch.commit();
      toast.success(`Updated ${docsToUpdate.length} event(s) in the series.`, { id: loadingToast });
    } catch (e: any) {
      toast.error(`Failed to update series: ${e.message}`, { id: loadingToast });
    } finally {
      setIsSeriesUpdateDialogOpen(false);
      setStagedUpdateData(null);
      onClose();
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent || !userProfile?.churchId) return;
    setIsDeletingEvent(true);
    try {
      await deleteDoc(doc(firestore, `churches/${userProfile.churchId}/events`, editingEvent.id));
      toast.success("Event deleted.");
      onClose();
    } catch {
      toast.error("Failed to delete event.");
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const handleAddRoleToEvent = async () => {
    if (!newRoleForEvent.trim() || !userProfile?.churchId || !editingEvent) return;
    try {
      await addDoc(collection(firestore, `churches/${userProfile.churchId}/events/${editingEvent.id}/roles`), {
        eventId: editingEvent.id,
        roleName: newRoleForEvent.trim(),
        status: "Pending",
      });
      setNewRoleForEvent("");
    } catch {
      toast.error("Failed to add role.");
    }
  };

  const handleDeleteRoleFromEvent = async (roleId: string) => {
    if (!userProfile?.churchId || !editingEvent) return;
    try {
      await deleteDoc(doc(firestore, `churches/${userProfile.churchId}/events/${editingEvent.id}/roles`, roleId));
      toast.success("Role removed.");
    } catch {
      toast.error("Failed to remove role.");
    }
  };

  const doAssignVolunteerToRole = async (roleId: string, volunteer: WithId<Volunteer> | null) => {
    if (!userProfile?.churchId || !editingEvent) return;
    await updateDoc(doc(firestore, `churches/${userProfile.churchId}/events/${editingEvent.id}/roles`, roleId), {
      assignedVolunteerId: volunteer ? volunteer.id : null,
      assignedVolunteerName: volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : null,
      status: volunteer ? "Confirmed" : "Pending",
    });
    if (volunteer && editingEvent.isPublished && volunteer.email) {
      void sendNotification({
        type: "assignment",
        toEmail: volunteer.email,
        toPhone: (volunteer as any).phone,
        smsOptIn: (volunteer as any).smsOptIn,
        volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
        eventName: editingEvent.eventName,
        eventDate: editingEvent.eventDate,
        roleName: eventRoles?.find(r => r.id === roleId)?.roleName || "Volunteer",
        churchName: churchName || "your church",
        churchId: userProfile.churchId,
      });
    }
    toast.success("Assignment updated.");
  };

  const handleAssignVolunteerToRole = async (roleId: string, volunteer: WithId<Volunteer> | null | undefined) => {
    if (!userProfile?.churchId || !editingEvent) return;
    if (volunteer === undefined) {
      setOneTimeVolunteerRole(roleId);
      return;
    }
    // Check for duplicate assignment on this event
    if (volunteer) {
      const duplicate = eventRoles?.find(
        (r) => r.id !== roleId && r.assignedVolunteerId === volunteer.id
      );
      if (duplicate) {
        setConflictWarning({ volunteer, roleId, conflictingRoleName: duplicate.roleName });
        return;
      }
    }
    try {
      await doAssignVolunteerToRole(roleId, volunteer);
    } catch {
      toast.error("Failed to update assignment.");
    }
  };

  const handleConfirmOneTimeVolunteer = async () => {
    if (!oneTimeVolunteerRole || !oneTimeVolunteerName.trim() || !userProfile?.churchId || !editingEvent) {
      toast.error("Please enter a name.");
      return;
    }
    try {
      await updateDoc(doc(firestore, `churches/${userProfile.churchId}/events/${editingEvent.id}/roles`, oneTimeVolunteerRole), {
        assignedVolunteerId: null,
        assignedVolunteerName: oneTimeVolunteerName.trim(),
        status: "Confirmed",
      });
      toast.success("One-time volunteer assigned.");
    } catch {
      toast.error("Failed to assign one-time volunteer.");
    } finally {
      setOneTimeVolunteerRole(null);
      setOneTimeVolunteerName("");
    }
  };

  const handleApplyTemplateToSingleEvent = async () => {
    if (!userProfile?.churchId || !editingEvent || !editSelectedTemplateId) {
      toast.error("Required information is missing to apply template.");
      return;
    }
    const toastId = toast.loading("Applying template...");
    try {
      const batch = writeBatch(firestore);
      const eventRef = doc(firestore, `churches/${userProfile.churchId}/events/${editingEvent.id}`);
      const rolesSubcollectionRef = collection(eventRef, "roles");
      const templateRef = doc(firestore, `churches/${userProfile.churchId}/service_templates/${editSelectedTemplateId}`);
      const templateSnap = await getDoc(templateRef);
      if (!templateSnap.exists()) throw new Error("Template not found.");
      const templateRoles = (templateSnap.data()?.roles as { name: string; quantity: number }[]) || [];
      const existingRolesSnap = await getDocs(rolesSubcollectionRef);
      existingRolesSnap.docs.forEach((roleDoc) => batch.delete(roleDoc.ref));
      for (const role of templateRoles) {
        for (let i = 0; i < (role.quantity || 1); i++) {
          batch.set(doc(rolesSubcollectionRef), {
            eventId: editingEvent.id,
            roleName: role.name,
            status: "Pending",
            assignedVolunteerId: null,
            assignedVolunteerName: null,
          });
        }
      }
      await batch.commit();
      toast.success("Template applied successfully!", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Failed to apply template.", { id: toastId });
    }
  };

  const handleAutoAssignSingleEvent = async () => {
    if (!editingEvent || !eventRoles || !volunteers || !roleTemplates || !templates || !userProfile?.churchId) {
      toast.error("Missing data to run auto-assignment.");
      return;
    }
    const unassignedRoles = eventRoles.filter((r) => !r.assignedVolunteerId);
    if (unassignedRoles.length === 0) {
      toast.success("All roles for this event are already filled!");
      return;
    }
    setIsAutoAssigning(true);
    const plainVolunteers = volunteers.map((v) => {
      const plainV: any = { ...v };
      if (plainV.lastAssigned && typeof plainV.lastAssigned.toDate === "function") plainV.lastAssigned = plainV.lastAssigned.toDate().toISOString();
      if (plainV.createdAt && typeof plainV.createdAt.toDate === "function") plainV.createdAt = plainV.createdAt.toDate().toISOString();
      return plainV;
    });

    const aiInput: AutoAssignInput = {
      event: { id: editingEvent.id, eventName: editingEvent.eventName, eventDate: editingEvent.eventDate, churchId: editingEvent.churchId, seriesId: editingEvent.seriesId },
      allRoles: eventRoles as any,
      unassignedRoles: [],
      volunteers: plainVolunteers,
      roleTemplates: roleTemplates.map((rt) => ({ id: rt.id, name: rt.name })),
      serviceTemplates: templates.map((st) => ({ id: st.id, name: st.name })),
    };

    try {
      const plan = await autoAssignVolunteers(aiInput);
      setSingleEventAssignmentPlan(plan);
    } catch (e: any) {
      toast.error(e.message || "Auto-assign failed.");
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleConfirmSingleEventAssignment = async () => {
    if (!singleEventAssignmentPlan || !userProfile?.churchId) {
      toast.error("No assignment plan to confirm.");
      return;
    }
    setIsAutoAssigning(true);
    const toastId = toast.loading("Applying assignments...");
    try {
      const batch = writeBatch(firestore);
      singleEventAssignmentPlan.assignments.forEach((a) => {
        batch.update(doc(firestore, `churches/${userProfile.churchId}/events/${a.eventId}/roles/${a.roleId}`), {
          assignedVolunteerId: a.volunteerId,
          assignedVolunteerName: a.volunteerName,
          status: "Confirmed",
        });
      });
      singleEventAssignmentPlan.userUpdates.forEach((u) => {
        batch.update(doc(firestore, "users", u.volunteerId), {
          assignmentCount: u.newAssignmentCount,
          lastAssigned: new Date(u.newLastAssigned).toISOString(),
        });
      });
      await batch.commit();
      toast.success("Assignments applied successfully!", { id: toastId });
      setSingleEventAssignmentPlan(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to apply assignments.", { id: toastId });
    } finally {
      setIsAutoAssigning(false);
    }
  };

  return (
    <>
      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Manage: {editingEvent?.eventName}
              {editingEvent?.seriesId && <Repeat className="h-4 w-4 text-muted-foreground" aria-label="Recurring Event" />}
            </DialogTitle>
            <DialogDescription>
              {editingEvent?.eventDate ? format(new Date(editingEvent.eventDate), "EEEE, MMMM do, yyyy 'at' h:mm a") : ""}
              {editingEvent?.seriesId && <span className="block text-xs mt-1">This is part of a recurring series.</span>}
            </DialogDescription>
          </DialogHeader>
          {editingEvent && (
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="roles">Roles ({eventRoles?.length || 0})</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-event-type">Event Type</Label>
                  <Select value={editForm.eventType} onValueChange={(v) => setEditForm({ ...editForm, eventType: v as any })}>
                    <SelectTrigger id="edit-event-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Generic Event">Generic Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-event-name">Event Name</Label>
                  <Input id="edit-event-name" value={editForm.eventName} onChange={(e) => setEditForm({ ...editForm, eventName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-event-date">Date</Label>
                    <Input id="edit-event-date" type="date" value={editForm.eventDate} onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-event-time">Time</Label>
                    <Input id="edit-event-time" type="time" value={editForm.eventTime} onChange={(e) => setEditForm({ ...editForm, eventTime: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-event-notes">Notes</Label>
                  <Textarea id="edit-event-notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                </div>
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="edit-isPublished" className="font-normal">Published to Volunteers</Label>
                    <Switch id="edit-isPublished" checked={editForm.isPublished} onCheckedChange={(checked) => setEditForm({ ...editForm, isPublished: checked })} />
                  </div>
                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="edit-isSignupEnabled" className="font-normal">Enable Self Sign-up</Label>
                      <Switch id="edit-isSignupEnabled" checked={editForm.isSignupEnabled} onCheckedChange={(checked) => setEditForm({ ...editForm, isSignupEnabled: checked })} />
                    </div>
                    {editForm.isSignupEnabled && (
                      <>
                        <div className="border-t pt-4 space-y-2">
                          <Label>Signup Scope</Label>
                          <RadioGroup value={editForm.signupScope} onValueChange={(value) => setEditForm({ ...editForm, signupScope: value })} className="space-y-1">
                            <div><div className="flex items-center space-x-2"><RadioGroupItem value="unassigned_only" id="r1" /><Label htmlFor="r1" className="font-normal">Only show unassigned roles</Label></div></div>
                            <div><div className="flex items-center space-x-2"><RadioGroupItem value="all_roles" id="r2" /><Label htmlFor="r2" className="font-normal">Show all roles (allow substitutions)</Label></div></div>
                          </RadioGroup>
                        </div>
                        <div className="border-t pt-4 flex items-center justify-between">
                          <Label htmlFor="edit-signupRequiresQualification" className="font-normal">Require Role Qualification</Label>
                          <Switch id="edit-signupRequiresQualification" checked={editForm.signupRequiresQualification} onCheckedChange={(checked) => setEditForm({ ...editForm, signupRequiresQualification: checked })} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="roles" className="py-4 space-y-4">
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-900 dark:text-blue-300"><Wand2 /> Assignment Assistant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" onClick={handleAutoAssignSingleEvent} disabled={isAutoAssigning || areEventRolesLoading || !eventRoles?.some((r) => !r.assignedVolunteerId)}>
                      {isAutoAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                      Auto-assign Open Roles
                    </Button>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Apply Template</CardTitle>
                    <CardDescription className="text-xs">This will replace all existing roles for this event.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Select value={editSelectedTemplateId || ""} onValueChange={(val) => {
                        if (val === "create_new") { onOpenCreateTemplate(); return; }
                        setEditSelectedTemplateId(val);
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="create_new" className="text-primary font-medium"><PlusCircle className="mr-2 h-4 w-4" /> Create new template...</SelectItem>
                          {templates?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button disabled={!editSelectedTemplateId}>Apply</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>Applying this template will delete all current roles for this event and replace them. This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleApplyTemplateToSingleEvent}>Confirm &amp; Replace</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or Manage Manually</span></div>
                </div>
                <div className="space-y-2">
                  <Label>Assigned Roles</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    {areEventRolesLoading && <p className="p-4 text-center">Loading roles...</p>}
                    {!areEventRolesLoading && eventRoles?.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No roles created for this event.</p>}
                    {eventRoles?.map((role) => (
                      <div key={role.id} className="flex items-center gap-2 p-2 border-b last:border-b-0">
                        <div className="flex-1 font-medium">{role.roleName}</div>
                        <div className="w-[300px]">
                          <VolunteerCombobox
                            allVolunteers={volunteers}
                            isLoading={volunteersLoading}
                            selectedVolunteerId={role.assignedVolunteerId}
                            onSelect={(volunteer) => handleAssignVolunteerToRole(role.id, volunteer as any)}
                            oneTimeLabel="Add one-time volunteer"
                          />
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteRoleFromEvent(role.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="new-role-for-event">Add New Role</Label>
                  <div className="flex gap-2">
                    <Input id="new-role-for-event" value={newRoleForEvent} onChange={(e) => setNewRoleForEvent(e.target.value)} placeholder="e.g., Greeter" />
                    <Button onClick={handleAddRoleToEvent}>Add Role</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter className="flex-col sm:flex-row sm:justify-between w-full pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeletingEvent}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete this event and all its roles. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEvent}>Delete Event</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSaveEventDetails}>Save Changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Series Update Scope Dialog */}
      <AlertDialog open={isSeriesUpdateDialogOpen} onOpenChange={setIsSeriesUpdateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Recurring Event</AlertDialogTitle>
            <AlertDialogDescription>This is a recurring event. How would you like to apply your changes?</AlertDialogDescription>
          </AlertDialogHeader>
          <RadioGroup defaultValue="one" onValueChange={(value) => setUpdateScope(value as any)}>
            <div className="flex items-center space-x-2"><RadioGroupItem value="one" id="r-one" /><Label htmlFor="r-one">This event only</Label></div>
            <div className="flex items-center space-x-2"><RadioGroupItem value="future" id="r-future" /><Label htmlFor="r-future">This and all future events</Label></div>
            <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="r-all" /><Label htmlFor="r-all">All events in this series</Label></div>
          </RadioGroup>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSeriesUpdate}>Apply Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-Assign Confirmation Dialog */}
      <AlertDialog open={!!singleEventAssignmentPlan} onOpenChange={(open) => !open && setSingleEventAssignmentPlan(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Review Auto-Assignment Plan</AlertDialogTitle>
            <AlertDialogDescription>{singleEventAssignmentPlan?.reasoning}</AlertDialogDescription>
          </AlertDialogHeader>
          {singleEventAssignmentPlan?.assignments && singleEventAssignmentPlan.assignments.length > 0 ? (
            <div className="max-h-60 overflow-y-auto border rounded-md my-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Assign To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {singleEventAssignmentPlan.assignments.map((a) => (
                    <TableRow key={a.roleId}>
                      <TableCell>{a.roleName}</TableCell>
                      <TableCell>{a.volunteerName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">The auto-assigner could not find any suitable assignments.</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSingleEventAssignmentPlan(null)} disabled={isAutoAssigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSingleEventAssignment} disabled={isAutoAssigning || !singleEventAssignmentPlan?.assignments.length}>
              {isAutoAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm &amp; Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conflict Warning Dialog */}
      <AlertDialog open={!!conflictWarning} onOpenChange={(open) => { if (!open) setConflictWarning(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Volunteer Already Assigned</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{conflictWarning?.volunteer.firstName} {conflictWarning?.volunteer.lastName}</strong> is already assigned to <strong>{conflictWarning?.conflictingRoleName}</strong> for this event. Do you still want to assign them to this role as well?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConflictWarning(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (conflictWarning) {
                  try {
                    await doAssignVolunteerToRole(conflictWarning.roleId, conflictWarning.volunteer);
                  } catch {
                    toast.error("Failed to update assignment.");
                  } finally {
                    setConflictWarning(null);
                  }
                }
              }}
            >
              Assign Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for one-time volunteer */}
      <Dialog open={!!oneTimeVolunteerRole} onOpenChange={(open) => { if (!open) { setOneTimeVolunteerRole(null); setOneTimeVolunteerName(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add One-Time Volunteer</DialogTitle>
            <DialogDescription>Enter the name for the volunteer serving in this role for this event only. This will not create a new user profile.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="one-time-name">Volunteer Name</Label>
            <Input
              id="one-time-name"
              value={oneTimeVolunteerName}
              onChange={(e) => setOneTimeVolunteerName(e.target.value)}
              placeholder="e.g., John Smith"
              onKeyUp={(e) => e.key === "Enter" && handleConfirmOneTimeVolunteer()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOneTimeVolunteerRole(null); setOneTimeVolunteerName(""); }}>Cancel</Button>
            <Button onClick={handleConfirmOneTimeVolunteer}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
