"use client";

import { useState, useEffect } from "react";
import {
  useFirestore,
  useCollection,
  WithId,
  useMemoFirebase,
  useUser,
  useDoc,
  errorEmitter,
} from "@/firebase";
import { collection, query, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, getDocs, where, limit, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { Search, PlusCircle, Users, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { sendVolunteerInvite, sendRoleRequestApprovedNotification, sendRoleRequestRejectedNotification } from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchParams } from "next/navigation";
import { useVolunteers } from "./hooks/useVolunteers";
import { VolunteerList } from "./components/VolunteerList";
import { VolunteerManagementSheet } from "./components/VolunteerManagementSheet";
import { AddVolunteerDialog, AddVolunteerData } from "./components/AddVolunteerDialog";
import { AdminProfile, ChurchProfile, Volunteer, RecurringService } from "./types";

export default function VolunteersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "role-requests" ? "role-requests" : "volunteers";

  const [selectedVolunteer, setSelectedVolunteer] = useState<WithId<Volunteer> | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 300);

  // Role requests state
  interface RoleRequest {
    id: string;
    volunteerId: string;
    volunteerName: string;
    volunteerEmail: string;
    roleId: string;
    roleName: string;
    status: "pending" | "approved" | "rejected";
    message?: string;
    requestedAt?: any;
  }
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [areRequestsLoading, setAreRequestsLoading] = useState(true);
  const [rejectDialogRequest, setRejectDialogRequest] = useState<RoleRequest | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [skipNotification, setSkipNotification] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);

  // 1. Get Admin Profile
  const adminDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: adminProfile } = useDoc<AdminProfile>(adminDocRef);

  // 2. Church profile
  const churchDocRef = useMemoFirebase(
    () =>
      adminProfile?.churchId && firestore
        ? doc(firestore, "churches", adminProfile.churchId)
        : null,
    [adminProfile?.churchId, firestore]
  );
  const { data: churchProfile } = useDoc<ChurchProfile>(churchDocRef);

  // 3. Fetch hooks
  const {
    volunteers,
    allVolunteers,
    isLoading: areVolunteersLoading,
    setSearchTerm,
    filterRole,
    setFilterRole,
    filterService,
    setFilterService,
    page,
    totalPages,
    handleNextPage,
    handlePrevPage,
    totalCount,
    refresh,
  } = useVolunteers(adminProfile?.churchId);

  useEffect(() => {
    setSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm, setSearchTerm]);

  // roles check
  const rolesQuery = useMemoFirebase(() => {
    if (!firestore || !adminProfile?.churchId) return null;
    return query(collection(firestore, `churches/${adminProfile.churchId}/role_templates`));
  }, [firestore, adminProfile?.churchId]);
  const { data: roles, isLoading: areRolesLoading } = useCollection<{ id: string, name: string }>(rolesQuery);

  const [recurringServices, setRecurringServices] = useState<RecurringService[]>([]);
  const [areServicesLoading, setAreServicesLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !adminProfile?.churchId) return;
    const fetchRecurringServices = async () => {
      setAreServicesLoading(true);
      const q = query(
        collection(firestore, `churches/${adminProfile.churchId}/events`),
        where("seriesId", "!=", null),
        limit(250)
      );
      try {
        const snapshot = await getDocs(q);
        const seriesMap = new Map<string, string>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as { seriesId: string; eventName: string };
          if (data.seriesId && !seriesMap.has(data.seriesId)) {
            seriesMap.set(data.seriesId, data.eventName);
          }
        });
        const uniqueServices = Array.from(seriesMap, ([seriesId, eventName]) => ({ seriesId, eventName }));
        setRecurringServices(uniqueServices.sort((a, b) => a.eventName.localeCompare(b.eventName)));
      } catch(e) { console.error(e) }
      setAreServicesLoading(false);
    };
    fetchRecurringServices();
  }, [firestore, adminProfile?.churchId]);

  // Fetch pending role requests
  useEffect(() => {
    if (!firestore || !adminProfile?.churchId) return;
    const fetchRequests = async () => {
      setAreRequestsLoading(true);
      try {
        const q = query(
          collection(firestore, `churches/${adminProfile.churchId}/role_requests`),
          where("status", "==", "pending"),
          orderBy("requestedAt", "desc"),
        );
        const snap = await getDocs(q);
        setRoleRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoleRequest, "id">) })));
      } catch (e) { console.error(e); }
      setAreRequestsLoading(false);
    };
    fetchRequests();
  }, [firestore, adminProfile?.churchId]);

  const refreshRoleRequests = async () => {
    if (!firestore || !adminProfile?.churchId) return;
    const q = query(
      collection(firestore, `churches/${adminProfile.churchId}/role_requests`),
      where("status", "==", "pending"),
      orderBy("requestedAt", "desc"),
    );
    const snap = await getDocs(q);
    setRoleRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoleRequest, "id">) })));
  };

  const getAdminBccEmails = () =>
    allVolunteers.filter((v) => v.isAdmin && v.email).map((v) => v.email as string);

  const handleApproveRoleRequest = async (request: RoleRequest) => {
    if (!firestore || !adminProfile?.churchId) return;
    setIsProcessingRequest(true);
    try {
      // Mark request approved
      await updateDoc(
        doc(firestore, `churches/${adminProfile.churchId}/role_requests`, request.id),
        { status: "approved", reviewedAt: serverTimestamp(), reviewedBy: user?.uid },
      );
      // Add role to volunteer's profile
      await updateDoc(doc(firestore, "users", request.volunteerId), {
        availableRoleIds: arrayUnion(request.roleId),
      });
      // Send approval email
      if (request.volunteerEmail) {
        void sendRoleRequestApprovedNotification({
          volunteerEmail: request.volunteerEmail,
          volunteerName: request.volunteerName,
          roleName: request.roleName,
          churchName: churchProfile?.name || "your church",
          loginUrl: `${window.location.origin}/dashboard/volunteer/preferences`,
          adminBccEmails: getAdminBccEmails(),
        });
      }
      toast.success(`${request.volunteerName} approved as ${request.roleName}.`);
      await refreshRoleRequests();
      refresh();
    } catch (e) {
      toast.error("Failed to approve request.");
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleRejectRoleRequest = async () => {
    if (!rejectDialogRequest || !firestore || !adminProfile?.churchId) return;
    setIsProcessingRequest(true);
    try {
      await updateDoc(
        doc(firestore, `churches/${adminProfile.churchId}/role_requests`, rejectDialogRequest.id),
        {
          status: "rejected",
          reviewedAt: serverTimestamp(),
          reviewedBy: user?.uid,
          rejectionNote: rejectionNote.trim() || null,
          notifyVolunteer: !skipNotification,
        },
      );
      if (!skipNotification && rejectDialogRequest.volunteerEmail) {
        void sendRoleRequestRejectedNotification({
          volunteerEmail: rejectDialogRequest.volunteerEmail,
          volunteerName: rejectDialogRequest.volunteerName,
          roleName: rejectDialogRequest.roleName,
          churchName: churchProfile?.name || "your church",
          rejectionNote: rejectionNote.trim() || undefined,
          adminBccEmails: getAdminBccEmails(),
        });
      }
      toast.success("Request declined.");
      setRejectDialogRequest(null);
      setRejectionNote("");
      setSkipNotification(false);
      await refreshRoleRequests();
    } catch (e) {
      toast.error("Failed to decline request.");
    } finally {
      setIsProcessingRequest(false);
    }
  };

  // Mutators!
  const handleAddVolunteer = async (data: AddVolunteerData) => {
    if (!firestore || !adminProfile?.churchId || !data.firstName.trim() || !data.lastName.trim()) {
      toast.error("First and last name are required.");
      return false;
    }
    if (data.sendInvite && !data.email.trim()) {
      toast.error("Email is required to send an invitation.");
      return false;
    }

    const { firstName, lastName, email, sendInvite, makeAdmin, selectedRoleIds, selectedServiceIds } = data;
    const loadingToast = toast.loading("Adding user...");

    const volunteerData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: sendInvite ? email.trim() : null,
      churchId: adminProfile.churchId,
      isManagedByAdmin: !sendInvite,
      status: sendInvite ? "pending_invitation" : "active",
      role: makeAdmin ? "admin" : "volunteer",
      isAdmin: makeAdmin,
      availableRoleIds: selectedRoleIds,
      availableRecurringEventSeriesIds: selectedServiceIds,
      createdAt: serverTimestamp(),
    };

    const collectionRef = collection(firestore, "users");

    try {
      const newDocRef = await addDoc(collectionRef, volunteerData);

      if (sendInvite) {
        await sendVolunteerInvite({
          type: "volunteer_invitation",
          toEmail: email.trim(),
          volunteerName: `${firstName.trim()} ${lastName.trim()}`,
          churchName: churchProfile?.name || "your church",
          adminName: user?.displayName || "Your Admin",
          claimUrl: `${window.location.origin}/claim-account?token=${newDocRef.id}`,
        });
        toast.success("User created and invitation sent!", { id: loadingToast });
      } else {
        toast.success("New user created!", { id: loadingToast });
      }
      refresh();
      return true;
    } catch (e) {
      toast.error("Failed to create user.", { id: loadingToast });
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: collectionRef.path,
        operation: "create",
        requestResourceData: volunteerData,
      }));
      return false;
    } 
  };

  const handleApprove = async (volunteerId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "users", volunteerId);
    try {
      await updateDoc(docRef, { status: "active" });
      // Send approval confirmation email
      const volunteer = allVolunteers.find(v => v.id === volunteerId);
      if (volunteer?.email) {
        void sendVolunteerInvite({
          type: "approval_confirmation",
          toEmail: volunteer.email,
          toPhone: (volunteer as any).phone,
          smsOptIn: (volunteer as any).smsOptIn,
          volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
          churchName: churchProfile?.name || "your church",
          loginUrl: `${window.location.origin}/dashboard`,
          churchId: adminProfile?.churchId,
        });
      }
      refresh();
      toast.success("Volunteer approved!");
    } catch (e) {
      toast.error("Failed to approve volunteer.");
    }
  };

  const handleDeny = async (volunteerId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "users", volunteerId);
    try {
      await deleteDoc(docRef);
      refresh();
      toast.success("Pending user removed.");
    } catch (e) {
      toast.error("Failed to remove user.");
    }
  };

  const handleRoleToggle = async (roleId: string, isChecked: boolean) => {
    if (!firestore || !selectedVolunteer) return;
    const docRef = doc(firestore, "users", selectedVolunteer.id);
    const updateData = {
      availableRoleIds: isChecked ? arrayUnion(roleId) : arrayRemove(roleId),
    };
    
    // optimistically update local UI model
    setSelectedVolunteer(prev => {
        if (!prev) return prev;
        const current = prev.availableRoleIds || [];
        return {
           ...prev,
           availableRoleIds: isChecked ? [...current, roleId] : current.filter(id => id !== roleId)
        };
    });

    try {
      await updateDoc(docRef, updateData);
      refresh();
      toast.success(`Updated roles.`);
    } catch(e) {
      toast.error("Failed to update roles.");
    }
  };

  const handleServicePreferenceToggle = async (seriesId: string, isChecked: boolean) => {
    if (!firestore || !selectedVolunteer) return;
    const docRef = doc(firestore, "users", selectedVolunteer.id);
    const updateData = {
      availableRecurringEventSeriesIds: isChecked ? arrayUnion(seriesId) : arrayRemove(seriesId),
    };
    
    setSelectedVolunteer(prev => {
        if (!prev) return prev;
        const current = prev.availableRecurringEventSeriesIds || [];
        return {
           ...prev,
           availableRecurringEventSeriesIds: isChecked ? [...current, seriesId] : current.filter(id => id !== seriesId)
        };
    });

    try {
      await updateDoc(docRef, updateData);
      refresh();
      toast.success(`Updated serving preferences.`);
    } catch (e) {
      toast.error("Failed to update preferences.");
    }
  };

  const handlePermissionChange = async (volunteerId: string, isAdmin: boolean) => {
    if (!firestore || !selectedVolunteer) return;
    const adminCount = allVolunteers.filter((v) => v.isAdmin).length;
    if (selectedVolunteer.id === user?.uid && adminCount <= 1 && !isAdmin) {
      toast.error("You cannot remove your own admin status as you are the only administrator.");
      return;
    }
    const docRef = doc(firestore, "users", volunteerId);
    try {
      await updateDoc(docRef, { isAdmin, role: isAdmin ? "admin" : "volunteer" });
      setSelectedVolunteer(prev => prev ? { ...prev, isAdmin, role: isAdmin ? "admin" : "volunteer" } : prev);
      refresh();
      toast.success(`Permissions updated.`);
    } catch (e) {
      toast.error("Failed to update permissions.");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Volunteer Management</h1>
            <p className="text-muted-foreground">View, create, and manage your church's users.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/admin/volunteers/bulk-manage">
                <Users className="mr-2 h-4 w-4" />
                Bulk Manage
              </Link>
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </header>

        <Tabs defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
            <TabsTrigger value="role-requests" className="gap-2">
              Role Requests
              {roleRequests.length > 0 && (
                <Badge className="h-5 min-w-5 px-1 text-xs">{roleRequests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Volunteers Tab */}
          <TabsContent value="volunteers" className="mt-6">
            <Card className="border-brand-accent/20">
              <CardHeader>
                <CardTitle>User List</CardTitle>
                <CardDescription>
                  {areVolunteersLoading ? "Loading users..." : `Found ${totalCount} user(s).`}
                </CardDescription>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      className="pl-9"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </div>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterService} onValueChange={setFilterService}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {recurringServices?.map((s) => (
                        <SelectItem key={s.seriesId} value={s.seriesId}>{s.eventName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {areVolunteersLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </div>
                ) : (
                  <VolunteerList
                    volunteers={volunteers}
                    recurringServices={recurringServices}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    onSelect={(v) => setSelectedVolunteer(v)}
                  />
                )}
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page <= 1}>Previous</Button>
                  <span className="text-sm text-muted-foreground px-2">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page >= totalPages}>Next</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role Requests Tab */}
          <TabsContent value="role-requests" className="mt-6">
            <Card className="border-brand-accent/20">
              <CardHeader>
                <CardTitle>Pending Role Requests</CardTitle>
                <CardDescription>
                  Volunteers who have requested to start serving in a new role.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {areRequestsLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </div>
                ) : roleRequests.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p>No pending role requests.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roleRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{request.volunteerName}</span>
                            <span className="text-muted-foreground text-sm">→</span>
                            <Badge variant="secondary">{request.roleName}</Badge>
                          </div>
                          {request.volunteerEmail && (
                            <p className="text-xs text-muted-foreground mt-0.5">{request.volunteerEmail}</p>
                          )}
                          {request.message && (
                            <p className="text-sm text-muted-foreground mt-2 italic border-l-2 pl-3 border-muted">
                              &ldquo;{request.message}&rdquo;
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => {
                              setRejectDialogRequest(request);
                              setRejectionNote("");
                              setSkipNotification(false);
                            }}
                            disabled={isProcessingRequest}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveRoleRequest(request)}
                            disabled={isProcessingRequest}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <VolunteerManagementSheet
        volunteer={selectedVolunteer}
        onClose={() => setSelectedVolunteer(null)}
        roles={roles ?? undefined}
        areRolesLoading={areRolesLoading}
        recurringServices={recurringServices}
        areServicesLoading={areServicesLoading}
        onPermissionChange={handlePermissionChange}
        onRoleToggle={handleRoleToggle}
        onServicePreferenceToggle={handleServicePreferenceToggle}
      />

      <AddVolunteerDialog
        isOpen={isAddOpen}
        setIsOpen={setIsAddOpen}
        roles={roles ?? undefined}
        recurringServices={recurringServices}
        onAddVolunteer={handleAddVolunteer}
      />

      {/* Reject Role Request Dialog */}
      <Dialog
        open={!!rejectDialogRequest}
        onOpenChange={(open) => !open && setRejectDialogRequest(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Role Request</DialogTitle>
            <DialogDescription>
              Declining <strong>{rejectDialogRequest?.volunteerName}</strong>&apos;s request to serve as <strong>{rejectDialogRequest?.roleName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!skipNotification && (
              <div className="space-y-2">
                <Label htmlFor="rejection-note">
                  Message to volunteer{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="rejection-note"
                  placeholder="e.g. We appreciate your interest! We currently have enough lectors scheduled, but please check back in a few months."
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            <div
              className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50"
              onClick={() => setSkipNotification((v) => !v)}
            >
              <Checkbox
                id="skip-notification"
                checked={skipNotification}
                onCheckedChange={(v) => setSkipNotification(Boolean(v))}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="skip-notification" className="cursor-pointer font-medium">
                  Don&apos;t send a response — I&apos;ll reach out personally
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No email will be sent. Use this if you prefer to have a personal conversation.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogRequest(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectRoleRequest}
              disabled={isProcessingRequest}
            >
              {isProcessingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
