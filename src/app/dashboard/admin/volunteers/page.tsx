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
import { collection, query, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, getDocs, where, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { Search, PlusCircle, Users, Loader2 } from "lucide-react";
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
import { useVolunteers } from "./hooks/useVolunteers";
import { VolunteerList } from "./components/VolunteerList";
import { VolunteerManagementSheet } from "./components/VolunteerManagementSheet";
import { AddVolunteerDialog, AddVolunteerData } from "./components/AddVolunteerDialog";
import { AdminProfile, ChurchProfile, Volunteer, RecurringService } from "./types";

export default function VolunteersPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [selectedVolunteer, setSelectedVolunteer] = useState<WithId<Volunteer> | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 300);

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
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
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
                    <SelectItem key={s.seriesId} value={s.seriesId}>
                      {s.eventName}
                    </SelectItem>
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
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
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
    </>
  );
}
