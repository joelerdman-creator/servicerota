"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
  errorEmitter,
} from "@/firebase";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  limit,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { Info, Clock, Loader2 } from "lucide-react";
import { CardSkeleton } from "@/components/ui/skeleton";
import { sendRoleRequestSubmittedNotification } from "@/app/dashboard/admin/volunteers/actions";

interface UserProfile {
  churchId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  availableRecurringEventSeriesIds?: string[];
  availableRoleIds?: string[];
}

interface RecurringService {
  seriesId: string;
  eventName: string;
}

interface RoleTemplate {
  id: string;
  name: string;
}

interface RoleRequest {
  id: string;
  roleId: string;
  roleName: string;
  status: "pending" | "approved" | "rejected";
  message?: string;
}

interface AdminUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isAdmin?: boolean;
}

export default function ServingPreferencesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [recurringServices, setRecurringServices] = useState<RecurringService[]>([]);
  const [areServicesLoading, setAreServicesLoading] = useState(true);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [areRequestsLoading, setAreRequestsLoading] = useState(true);

  // Request dialog state
  const [requestDialogRole, setRequestDialogRole] = useState<RoleTemplate | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const saveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSavedToast = useCallback(() => {
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    saveToastTimer.current = setTimeout(() => toast.success("All changes saved."), 800);
  }, []);

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const roleTemplatesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId) return null;
    return collection(firestore, `churches/${userProfile.churchId}/role_templates`);
  }, [firestore, userProfile?.churchId]);
  const { data: roleTemplates, isLoading: areRolesLoading } =
    useCollection<RoleTemplate>(roleTemplatesQuery);

  // Fetch recurring services
  useEffect(() => {
    if (!firestore || !userProfile?.churchId) return;
    const fetch = async () => {
      setAreServicesLoading(true);
      const q = query(
        collection(firestore, `churches/${userProfile.churchId}/events`),
        where("seriesId", "!=", null),
        limit(250),
      );
      const snapshot = await getDocs(q);
      const seriesMap = new Map<string, string>();
      snapshot.forEach((d) => {
        const data = d.data() as { seriesId: string; eventName: string };
        if (!seriesMap.has(data.seriesId)) seriesMap.set(data.seriesId, data.eventName);
      });
      setRecurringServices(
        Array.from(seriesMap, ([seriesId, eventName]) => ({ seriesId, eventName })).sort((a, b) =>
          a.eventName.localeCompare(b.eventName),
        ),
      );
      setAreServicesLoading(false);
    };
    fetch();
  }, [firestore, userProfile?.churchId]);

  // Fetch this volunteer's role requests
  useEffect(() => {
    if (!firestore || !userProfile?.churchId || !user?.uid) return;
    const fetch = async () => {
      setAreRequestsLoading(true);
      const q = query(
        collection(firestore, `churches/${userProfile.churchId}/role_requests`),
        where("volunteerId", "==", user.uid),
      );
      const snapshot = await getDocs(q);
      setRoleRequests(
        snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoleRequest, "id">) })),
      );
      setAreRequestsLoading(false);
    };
    fetch();
  }, [firestore, userProfile?.churchId, user?.uid]);

  useEffect(() => {
    if (userProfile?.availableRecurringEventSeriesIds)
      setSelectedServices(new Set(userProfile.availableRecurringEventSeriesIds));
    if (userProfile?.availableRoleIds) setSelectedRoles(new Set(userProfile.availableRoleIds));
  }, [userProfile]);

  const handleToggleService = async (seriesId: string, isChecked: boolean) => {
    if (!userDocRef) return;
    setIsSaving(true);
    const original = new Set(selectedServices);
    const next = new Set(original);
    isChecked ? next.add(seriesId) : next.delete(seriesId);
    setSelectedServices(next);
    try {
      await updateDoc(userDocRef, {
        availableRecurringEventSeriesIds: isChecked
          ? arrayUnion(seriesId)
          : arrayRemove(seriesId),
      });
      triggerSavedToast();
    } catch {
      toast.error("Failed to update preferences.");
      setSelectedServices(original);
      errorEmitter.emit(
        "permission-error",
        new FirestorePermissionError({ path: userDocRef.path, operation: "update" }),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRole = async (roleId: string, isChecked: boolean) => {
    if (!userDocRef) return;
    setIsSavingRole(true);
    const original = new Set(selectedRoles);
    const next = new Set(original);
    isChecked ? next.add(roleId) : next.delete(roleId);
    setSelectedRoles(next);
    try {
      await updateDoc(userDocRef, {
        availableRoleIds: isChecked ? arrayUnion(roleId) : arrayRemove(roleId),
      });
      triggerSavedToast();
    } catch {
      toast.error("Failed to update role preferences.");
      setSelectedRoles(original);
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestDialogRole || !firestore || !userProfile?.churchId || !user?.uid) return;
    setIsSubmittingRequest(true);
    try {
      // Create the request document
      const requestRef = collection(
        firestore,
        `churches/${userProfile.churchId}/role_requests`,
      );
      await addDoc(requestRef, {
        volunteerId: user.uid,
        volunteerName: `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim(),
        volunteerEmail: userProfile.email || user.email || "",
        roleId: requestDialogRole.id,
        roleName: requestDialogRole.name,
        status: "pending",
        message: requestMessage.trim() || null,
        requestedAt: serverTimestamp(),
      });

      // Optimistically add to local state
      setRoleRequests((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          roleId: requestDialogRole.id,
          roleName: requestDialogRole.name,
          status: "pending",
          message: requestMessage.trim() || undefined,
        },
      ]);

      // Notify all admins
      const adminsQuery = query(
        collection(firestore, "users"),
        where("churchId", "==", userProfile.churchId),
        where("isAdmin", "==", true),
      );
      const adminsSnap = await getDocs(adminsQuery);
      const admins = adminsSnap.docs.map((d) => ({ ...(d.data() as AdminUser), id: d.id }));
      const adminEmails = admins.map((a) => a.email).filter(Boolean) as string[];
      const adminNames = admins.map((a) => `${a.firstName || ""} ${a.lastName || ""}`.trim()).filter(Boolean);

      if (adminEmails.length > 0) {
        void sendRoleRequestSubmittedNotification({
          adminEmails,
          adminNames,
          volunteerName: `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim(),
          roleName: requestDialogRole.name,
          churchName: "",
          message: requestMessage.trim() || undefined,
          dashboardUrl: `${window.location.origin}/dashboard/admin/volunteers`,
        });
      }

      toast.success(`Request to serve as ${requestDialogRole.name} submitted!`);
      setRequestDialogRole(null);
      setRequestMessage("");
    } catch (e) {
      toast.error("Failed to submit request.");
      console.error(e);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleCancelRequest = async (request: RoleRequest) => {
    if (!firestore || !userProfile?.churchId) return;
    try {
      await deleteDoc(doc(firestore, `churches/${userProfile.churchId}/role_requests`, request.id));
      setRoleRequests((prev) => prev.filter((r) => r.id !== request.id));
      toast.success("Request cancelled.");
    } catch {
      toast.error("Failed to cancel request.");
    }
  };

  const isLoading = isUserLoading || isProfileLoading || areServicesLoading;

  // Split roles into serving and not-serving
  const currentRoles = roleTemplates?.filter((r) => selectedRoles.has(r.id)) ?? [];
  const otherRoles = roleTemplates?.filter((r) => !selectedRoles.has(r.id)) ?? [];

  const getPendingRequest = (roleId: string) =>
    roleRequests.find((r) => r.roleId === roleId && r.status === "pending");

  return (
    <div className="w-full max-w-2xl">
      <PageHeader
        title="My Serving Preferences"
        description="Tell your admin which services you attend and which roles you can serve in."
        backHref="/dashboard/volunteer"
        backLabel="Dashboard"
      />

      <div className="flex items-start gap-2 mb-6 p-3 rounded-md bg-muted/50 border text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Your admin uses these preferences to automatically match you to roles you&apos;re
          qualified for at services you attend.
        </span>
      </div>

      <div className="space-y-8">
        {/* Services I Attend */}
        <Card>
          <CardHeader>
            <CardTitle>Services I Attend</CardTitle>
            <CardDescription>
              Select all the services you typically attend and are willing to be scheduled for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CardSkeleton />
            ) : recurringServices.length > 0 ? (
              <div className="space-y-3">
                {recurringServices.map((service) => (
                  <div
                    key={service.seriesId}
                    className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50"
                  >
                    <Checkbox
                      id={service.seriesId}
                      checked={selectedServices.has(service.seriesId)}
                      onCheckedChange={(checked) =>
                        handleToggleService(service.seriesId, Boolean(checked))
                      }
                      disabled={isSaving}
                    />
                    <Label
                      htmlFor={service.seriesId}
                      className="text-base font-normal cursor-pointer flex-1"
                    >
                      {service.eventName}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Your church has not set up any recurring services yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* My Roles — Currently Serving */}
        <Card>
          <CardHeader>
            <CardTitle>Currently Serving</CardTitle>
            <CardDescription>
              Roles you are currently approved to serve in. Uncheck to remove a role from your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isUserLoading || isProfileLoading || areRolesLoading ? (
              <CardSkeleton />
            ) : currentRoles.length > 0 ? (
              <div className="space-y-3">
                {currentRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`role-${role.id}`}
                      checked
                      onCheckedChange={() => handleToggleRole(role.id, false)}
                      disabled={isSavingRole}
                    />
                    <Label
                      htmlFor={`role-${role.id}`}
                      className="text-base font-normal cursor-pointer flex-1"
                    >
                      {role.name}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">
                You are not currently serving in any roles.
              </p>
            )}
          </CardContent>
        </Card>

        {/* My Roles — Not Currently Serving */}
        <Card>
          <CardHeader>
            <CardTitle>Not Currently Serving</CardTitle>
            <CardDescription>
              Roles you are not yet approved for. Send a request to your admin to start serving in one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isUserLoading || isProfileLoading || areRolesLoading || areRequestsLoading ? (
              <CardSkeleton />
            ) : otherRoles.length > 0 ? (
              <div className="space-y-3">
                {otherRoles.map((role) => {
                  const pending = getPendingRequest(role.id);
                  return (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 rounded-md border"
                    >
                      <span className="text-base">{role.name}</span>
                      {pending ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground text-xs h-7"
                            onClick={() => handleCancelRequest(pending)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRequestDialogRole(role);
                            setRequestMessage("");
                          }}
                        >
                          Request
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">
                You are serving in all available roles.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Dialog */}
      <Dialog open={!!requestDialogRole} onOpenChange={(open) => !open && setRequestDialogRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Serve as {requestDialogRole?.name}</DialogTitle>
            <DialogDescription>
              Your admin will review this request and approve or decline it. You&apos;ll receive an
              email when a decision is made.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="request-message" className="text-sm font-medium">
              Message to admin{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="request-message"
              placeholder="e.g. I've completed the lector training and would love to start serving in this role."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogRole(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={isSubmittingRequest}>
              {isSubmittingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
