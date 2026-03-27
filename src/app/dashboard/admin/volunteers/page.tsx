
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useFirestore,
  useCollection,
  WithId,
  useMemoFirebase,
  useUser,
  useDoc,
  errorEmitter,
} from "@/firebase";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  DocumentSnapshot,
  getDocs,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  CheckCircle,
  XCircle,
  PlusCircle,
  Users,
  Shield,
  UserCog,
  CalendarOff,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Settings2,
  ListTodo,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { sendVolunteerInvite } from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { getServiceColor, cn } from "@/lib/utils";

// --- TYPES ---
interface AdminProfile {
  churchId?: string;
  name?: string;
}

interface ChurchProfile {
  name: string;
}

interface Volunteer {
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
}

interface RecurringService {
  seriesId: string;
  eventName: string;
}

const PAGE_SIZE = 10;

export default function VolunteersPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [selectedVolunteer, setSelectedVolunteer] = useState<WithId<Volunteer> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const [page, setPage] = useState(1);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [firstDoc, setFirstDoc] = useState<DocumentSnapshot | null>(null);
  const [allVolunteers, setAllVolunteers] = useState<WithId<Volunteer>[]>([]);
  const [areVolunteersLoading, setAreVolunteersLoading] = useState(true);
  const [totalVolunteerCount, setTotalVolunteerCount] = useState(0);

  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterService, setFilterService] = useState<string>("all");

  const handleFilterRoleChange = (val: string) => {
    setFilterRole(val);
    if (val !== "all" && filterService !== "all") {
      setFilterService("all");
      toast("Service filter cleared due to database limits.");
    }
  };

  const handleFilterServiceChange = (val: string) => {
    setFilterService(val);
    if (val !== "all" && filterRole !== "all") {
      setFilterRole("all");
      toast("Role filter cleared due to database limits.");
    }
  };

  // State for Add Volunteer Dialog
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [sendInvite, setSendInvite] = useState(false);
  const [makeAdmin, setMakeAdmin] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Get Admin's churchId
  const adminDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: adminProfile, isLoading: isAdminProfileLoading } =
    useDoc<AdminProfile>(adminDocRef);

  const { data: churchProfile, isLoading: isChurchLoading } = useDoc<ChurchProfile>(
    useMemoFirebase(
      () =>
        adminProfile?.churchId && firestore
          ? doc(firestore, "churches", adminProfile.churchId)
          : null,
      [adminProfile?.churchId, firestore],
    ),
  );
  
  // 3. Fetch all available roles for the church
  const rolesQuery = useMemoFirebase(() => {
    if (!firestore || !adminProfile?.churchId) return null;
    return query(collection(firestore, `churches/${adminProfile.churchId}/role_templates`));
  }, [firestore, adminProfile?.churchId]);
  const { data: roles, isLoading: areRolesLoading } = useCollection<{ name: string }>(rolesQuery);

  const [recurringServices, setRecurringServices] = useState<RecurringService[]>([]);
  const [areServicesLoading, setAreServicesLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !adminProfile?.churchId) return;

    const fetchRecurringServices = async () => {
      setAreServicesLoading(true);
      const q = query(
        collection(firestore, `churches/${adminProfile.churchId}/events`),
        where("seriesId", "!=", null),
        limit(250) // Reasonable limit to avoid huge queries
      );
      const snapshot = await getDocs(q);
      const seriesMap = new Map<string, string>();
      snapshot.forEach(doc => {
        const data = doc.data() as { seriesId: string; eventName: string };
        if (!seriesMap.has(data.seriesId)) {
          seriesMap.set(data.seriesId, data.eventName);
        }
      });
      const uniqueServices = Array.from(seriesMap, ([seriesId, eventName]) => ({ seriesId, eventName }));
      setRecurringServices(uniqueServices.sort((a,b) => a.eventName.localeCompare(b.eventName)));
      setAreServicesLoading(false);
    };

    fetchRecurringServices();
  }, [firestore, adminProfile?.churchId]);

  const fetchVolunteers = async (direction: 'next' | 'prev' | 'search' = 'next') => {
    if (!firestore || !adminProfile?.churchId) return;

    setAreVolunteersLoading(true);

    let q;
    const baseQuery = collection(firestore, "users");
    const baseConstraints = [where("churchId", "==", adminProfile.churchId)];

    if (debouncedSearchTerm) {
      baseConstraints.push(where("lastName", ">=", debouncedSearchTerm));
      baseConstraints.push(where("lastName", "<=", debouncedSearchTerm + "\uf8ff"));
    }

    if (filterRole !== "all") {
      baseConstraints.push(where("availableRoleIds", "array-contains", filterRole));
    } else if (filterService !== "all") {
      baseConstraints.push(where("availableRecurringEventSeriesIds", "array-contains", filterService));
    }

    if (direction === 'next' && lastDoc) {
      q = query(baseQuery, ...baseConstraints, orderBy("lastName"), orderBy("firstName"), startAfter(lastDoc), limit(PAGE_SIZE));
    } else if (direction === 'prev' && firstDoc) {
      q = query(baseQuery, ...baseConstraints, orderBy("lastName", "desc"), orderBy("firstName", "desc"), startAfter(firstDoc), limit(PAGE_SIZE));
    } else { // 'search' or initial load
      q = query(baseQuery, ...baseConstraints, orderBy("lastName"), orderBy("firstName"), limit(PAGE_SIZE));
    }

    try {
      const docSnap = await getDocs(q);
      const volunteersData = docSnap.docs.map(d => ({ id: d.id, ...d.data() } as WithId<Volunteer>));
      
      if (direction === 'prev') {
          volunteersData.reverse(); // Reverse to maintain correct order
      }
      
      setAllVolunteers(volunteersData);
      
      if (docSnap.docs.length > 0) {
        setFirstDoc(docSnap.docs[0]);
        setLastDoc(docSnap.docs[docSnap.docs.length - 1]);
      } else if (direction !== 'prev') {
         setLastDoc(null); // No more pages
      }

      if(direction === 'search') {
          setPage(1);
      }

      // Get total count for description
      const countQuery = query(collection(firestore, "users"), where("churchId", "==", adminProfile.churchId));
      const countSnapshot = await getDocs(countQuery);
      setTotalVolunteerCount(countSnapshot.size);

    } catch (error) {
      console.error("Error fetching volunteers:", error);
      toast.error("Could not fetch volunteers.");
    } finally {
      setAreVolunteersLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteers('search');
  }, [debouncedSearchTerm, adminProfile?.churchId, filterRole, filterService]);

  const handleNextPage = () => {
    if (lastDoc) {
      setPage(p => p + 1);
      fetchVolunteers('next');
    }
  };
  
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(p => p - 1);
      // We need to re-fetch the previous page. This is complex with startAfter/endBefore.
      // A simpler approach for now is just to go back to the start on "prev".
      // A full solution requires managing an array of snapshot cursors.
      fetchVolunteers('search'); // Reset to first page for simplicity
    }
  };

  const resetAddDialog = () => {
    setNewFirstName("");
    setNewLastName("");
    setNewEmail("");
    setSendInvite(false);
    setMakeAdmin(false);
    setIsAddOpen(false);
  };

  const handleAddVolunteer = async () => {
    if (!firestore || !adminProfile?.churchId || !newFirstName.trim() || !newLastName.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    if (sendInvite && !newEmail.trim()) {
      toast.error("Email is required to send an invitation.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Adding user...");

    const volunteerData = {
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      email: sendInvite ? newEmail.trim() : null,
      churchId: adminProfile.churchId,
      isManagedByAdmin: !sendInvite,
      status: sendInvite ? "pending_invitation" : "active",
      role: makeAdmin ? "admin" : "volunteer",
      isAdmin: makeAdmin,
      createdAt: serverTimestamp(),
    };

    const collectionRef = collection(firestore, "users");

    try {
      const newDocRef = await addDoc(collectionRef, volunteerData);

      if (sendInvite) {
        await sendVolunteerInvite({
          type: "volunteer_invitation",
          toEmail: newEmail.trim(),
          volunteerName: `${newFirstName.trim()} ${newLastName.trim()}`,
          churchName: churchProfile?.name || "your church",
          adminName: user?.displayName || "Your Admin",
          claimUrl: `${window.location.origin}/claim-account?token=${newDocRef.id}`,
        });
        toast.success("User created and invitation sent!", { id: loadingToast });
      } else {
        toast.success("New user created!", { id: loadingToast });
      }
      fetchVolunteers('search'); // Refresh list
      resetAddDialog();
    } catch (e) {
      toast.error("Failed to create user.", { id: loadingToast });
      const permissionError = new FirestorePermissionError({
        path: collectionRef.path,
        operation: "create",
        requestResourceData: volunteerData,
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleToggle = async (roleId: string, isChecked: boolean) => {
    if (!firestore || !selectedVolunteer) return;

    const volunteerDocRef = doc(firestore, "users", selectedVolunteer.id);

    const updateData = {
      availableRoleIds: isChecked ? arrayUnion(roleId) : arrayRemove(roleId),
    };

    const originalRoles = selectedVolunteer.availableRoleIds || [];
    const newRoles = isChecked
      ? [...originalRoles, roleId]
      : originalRoles.filter((id) => id !== roleId);

    setSelectedVolunteer((prev) => (prev ? { ...prev, availableRoleIds: newRoles } : null));

    try {
      await updateDoc(volunteerDocRef, updateData);
      toast.success(`Updated roles for ${selectedVolunteer.firstName}.`);
    } catch (e) {
      setSelectedVolunteer((prev) => (prev ? { ...prev, availableRoleIds: originalRoles } : null));
      toast.error("Failed to update roles.");
      const permissionError = new FirestorePermissionError({
        path: volunteerDocRef.path,
        operation: "update",
        requestResourceData: updateData,
      });
      errorEmitter.emit("permission-error", permissionError);
    }
  };
  
  const handleServicePreferenceToggle = async (seriesId: string, isChecked: boolean) => {
    if (!firestore || !selectedVolunteer) return;

    const volunteerDocRef = doc(firestore, "users", selectedVolunteer.id);
    const updateData = {
        availableRecurringEventSeriesIds: isChecked ? arrayUnion(seriesId) : arrayRemove(seriesId),
    };

    // Optimistic UI update
    const originalTemplates = selectedVolunteer.availableRecurringEventSeriesIds || [];
    const newTemplates = isChecked ? [...originalTemplates, seriesId] : originalTemplates.filter((id) => id !== seriesId);

    setSelectedVolunteer((prev) => (prev ? { ...prev, availableRecurringEventSeriesIds: newTemplates } : null));

    try {
        await updateDoc(volunteerDocRef, updateData);
        toast.success(`Updated serving preferences for ${selectedVolunteer.firstName}.`);
    } catch (e) {
        setSelectedVolunteer((prev) => (prev ? { ...prev, availableRecurringEventSeriesIds: originalTemplates } : null));
        toast.error("Failed to update preferences.");
        const permissionError = new FirestorePermissionError({
            path: volunteerDocRef.path,
            operation: "update",
            requestResourceData: updateData,
        });
        errorEmitter.emit("permission-error", permissionError);
    }
  };

  const handlePermissionChange = async (volunteerId: string, isAdmin: boolean) => {
    if (!firestore || !selectedVolunteer) return;

    // Prevent user from demoting themselves if they are the only admin
    const adminCount = allVolunteers?.filter((v) => v.isAdmin).length || 0;
    if (selectedVolunteer.id === user?.uid && adminCount <= 1 && !isAdmin) {
      toast.error("You cannot remove your own admin status as you are the only administrator.");
      return;
    }

    const volunteerDocRef = doc(firestore, "users", volunteerId);
    const updateData = {
      isAdmin: isAdmin,
      role: isAdmin ? "admin" : "volunteer",
    };

    try {
      await updateDoc(volunteerDocRef, updateData);
      toast.success(`${selectedVolunteer.firstName}'s permissions have been updated.`);
      setSelectedVolunteer((prev) =>
        prev ? { ...prev, ...(updateData as Partial<WithId<Volunteer>>) } : null,
      );
      fetchVolunteers('search');
    } catch (e) {
      toast.error("Failed to update permissions.");
      const permissionError = new FirestorePermissionError({
        path: volunteerDocRef.path,
        operation: "update",
        requestResourceData: updateData,
      });
      errorEmitter.emit("permission-error", permissionError);
    }
  };

  const handleApprove = async (volunteerId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "users", volunteerId);
    const updateData = { status: "active" };
    try {
      await updateDoc(docRef, updateData);
      fetchVolunteers('search');
      toast.success("Volunteer approved!");
    } catch (e) {
      toast.error("Failed to approve volunteer.");
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: "update",
        requestResourceData: updateData,
      });
      errorEmitter.emit("permission-error", permissionError);
    }
  };

  const handleDeny = async (volunteerId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, "users", volunteerId);
    try {
      await deleteDoc(docRef);
      fetchVolunteers('search');
      toast.success("Pending user removed.");
    } catch (e) {
      toast.error("Failed to remove user.");
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: "delete",
      });
      errorEmitter.emit("permission-error", permissionError);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const isLoading =
    isAdminProfileLoading || areVolunteersLoading || areRolesLoading || areServicesLoading || isChurchLoading;

  const getStatusBadge = (status?: "active" | "pending_approval" | "pending_invitation") => {
    switch (status) {
      case "pending_approval":
        return <Badge variant="secondary">Pending Approval</Badge>;
      case "pending_invitation":
        return <Badge variant="outline">Invitation Sent</Badge>;
      default:
        return null;
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
        <Card className="border-brand-accent/20">
          <CardHeader>
            <CardTitle>User List</CardTitle>
            <CardDescription>
              {areVolunteersLoading
                ? "Loading users..."
                : `Found ${totalVolunteerCount} user(s).`}
            </CardDescription>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by last name..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterRole} onValueChange={handleFilterRoleChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterService} onValueChange={handleFilterServiceChange}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {recurringServices?.map(s => <SelectItem key={s.seriesId} value={s.seriesId}>{s.eventName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              {areVolunteersLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : allVolunteers && allVolunteers.length > 0 ? (
                allVolunteers.map((volunteer) => (
                  <div
                    key={volunteer.id}
                    className="flex items-center justify-between p-3 border-b last:border-b-0 "
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar>
                        <AvatarImage
                          src={volunteer.photoURL}
                          alt={`${volunteer.firstName} ${volunteer.lastName}`}
                        />
                        <AvatarFallback>
                          {getInitials(volunteer.firstName, volunteer.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {volunteer.firstName} {volunteer.lastName}
                          {volunteer.isAdmin && (
                            <Badge>
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {volunteer.isManagedByAdmin && !volunteer.isAdmin && (
                            <Badge variant="outline">Admin-Managed</Badge>
                          )}
                          {volunteer.availableRecurringEventSeriesIds?.map((seriesId) => {
                            const service = recurringServices?.find((s) => s.seriesId === seriesId);
                            if (!service) return null;
                            return (
                              <Badge 
                                key={seriesId} 
                                variant="secondary" 
                                className={cn(getServiceColor(seriesId), "border-none font-normal")}
                              >
                                {service.eventName}
                              </Badge>
                            );
                          })}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          {volunteer.email || "No email provided"}
                          {getStatusBadge(volunteer.status)}
                        </p>
                      </div>
                    </div>

                    {volunteer.status === "pending_approval" ||
                    volunteer.status === "pending_invitation" ? (
                      <div className="flex items-center gap-2">
                        {volunteer.status === "pending_approval" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => handleApprove(volunteer.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {volunteer.status === "pending_approval" ? "Deny" : "Revoke"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the pending request for{" "}
                                {volunteer.firstName}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeny(volunteer.id)}>
                                Confirm
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setSelectedVolunteer(volunteer)}>
                          Manage
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">No users found for your search.</div>
              )}
            </div>
             <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page <= 1 || areVolunteersLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!lastDoc || areVolunteersLoading || allVolunteers.length < PAGE_SIZE}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Sheet */}
      <Sheet
        open={!!selectedVolunteer}
        onOpenChange={(open) => !open && setSelectedVolunteer(null)}
      >
        <SheetContent className="sm:max-w-lg w-full flex flex-col">
          {selectedVolunteer && (
            <>
              <SheetHeader className="pr-12">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={selectedVolunteer.photoURL}
                      alt={`${selectedVolunteer.firstName} ${selectedVolunteer.lastName}`}
                    />
                    <AvatarFallback className="text-xl">
                      {getInitials(selectedVolunteer.firstName, selectedVolunteer.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-2xl">
                      {selectedVolunteer.firstName} {selectedVolunteer.lastName}
                    </SheetTitle>
                    <SheetDescription>{selectedVolunteer.email}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="py-6 space-y-8 flex-grow overflow-y-auto pr-2">
                <Card className="bg-muted/50 border-brand-accent/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center">
                      <UserCog className="mr-2 h-5 w-5 text-brand-accent" />
                      User Permissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedVolunteer.isAdmin ? "admin" : "volunteer"}
                      onValueChange={(value) =>
                        handlePermissionChange(selectedVolunteer.id, value === "admin")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a permission level..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Administrators can manage settings, events, and other users.
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Available Roles</h3>
                  {areRolesLoading && <p>Loading roles...</p>}
                  {roles?.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No roles have been created yet. Go to "Settings" to add some.
                    </p>
                  )}
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {roles?.map((role) => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedVolunteer.availableRoleIds?.includes(role.id)}
                          onCheckedChange={(checked) => handleRoleToggle(role.id, !!checked)}
                        />
                        <Label htmlFor={`role-${role.id}`} className="font-normal cursor-pointer">
                          {role.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                 <div className="space-y-4">
                    <h3 className="font-medium text-lg flex items-center gap-2"><ListTodo />Serving Preferences</h3>
                    <p className="text-sm text-muted-foreground">Select the recurring services this volunteer is available to serve at.</p>
                     {areServicesLoading && <p>Loading services...</p>}
                     <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {recurringServices?.map((service) => (
                            <div key={service.seriesId} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`service-${service.seriesId}`}
                                    checked={selectedVolunteer.availableRecurringEventSeriesIds?.includes(service.seriesId)}
                                    onCheckedChange={(checked) => handleServicePreferenceToggle(service.seriesId, !!checked)}
                                />
                                <Label htmlFor={`service-${service.seriesId}`} className="font-normal cursor-pointer">{service.eventName}</Label>
                            </div>
                        ))}
                     </div>
                 </div>


                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-medium text-lg">Other Actions</h3>
                  <div className="flex flex-col gap-2">
                    <Button asChild variant="outline">
                      <Link href={`/dashboard/admin/manage/${selectedVolunteer.id}/availability`}>
                        <CalendarOff className="mr-2 h-4 w-4" />
                        Manage Availability
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/dashboard/admin/manage/${selectedVolunteer.id}/family`}>
                        <Users className="mr-2 h-4 w-4" />
                        Manage Family
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button>Done</Button>
                </SheetClose>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new profile. You can either manage it yourself or invite them to join via
              email.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="first-name" className="text-right">
                First Name
              </Label>
              <Input
                id="first-name"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="last-name" className="text-right">
                Last Name
              </Label>
              <Input
                id="last-name"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="col-span-4 border-t pt-4 mt-2 space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="send-invite"
                  checked={sendInvite}
                  onCheckedChange={(checked) => setSendInvite(!!checked)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="send-invite"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Send email invitation
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow this user to log in and manage their own account.
                  </p>
                </div>
              </div>
              {sendInvite && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              )}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="make-admin"
                  checked={makeAdmin}
                  onCheckedChange={(checked) => setMakeAdmin(!!checked)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="make-admin"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Make this user an Administrator
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Admins can manage events, users, and church settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={resetAddDialog}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleAddVolunteer} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
