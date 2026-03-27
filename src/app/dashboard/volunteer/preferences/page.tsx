"use client";

import { useState, useEffect } from "react";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, errorEmitter, WithId } from "@/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, limit } from "firebase/firestore";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { Loader2, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/skeleton";

interface UserProfile {
  churchId?: string;
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

export default function VolunteerPreferencesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);

  // --- Data Fetching ---
  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const [recurringServices, setRecurringServices] = useState<RecurringService[]>([]);
  const [areServicesLoading, setAreServicesLoading] = useState(true);

  // Fetch Roles
  const roleTemplatesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId) return null;
    return collection(firestore, `churches/${userProfile.churchId}/role_templates`);
  }, [firestore, userProfile?.churchId]);
  
  const { data: roleTemplates, isLoading: areRolesLoading } = useCollection<RoleTemplate>(roleTemplatesQuery);

  useEffect(() => {
    if (!firestore || !userProfile?.churchId) return;

    const fetchRecurringServices = async () => {
      setAreServicesLoading(true);
      const q = query(
        collection(firestore, `churches/${userProfile.churchId}/events`),
        where("seriesId", "!=", null),
        limit(250) // Reasonable limit
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
  }, [firestore, userProfile?.churchId]);


  useEffect(() => {
    if (userProfile?.availableRecurringEventSeriesIds) {
      setSelectedServices(new Set(userProfile.availableRecurringEventSeriesIds));
    }
    if (userProfile?.availableRoleIds) {
      setSelectedRoles(new Set(userProfile.availableRoleIds));
    }
  }, [userProfile]);

  const handleToggleService = async (seriesId: string, isChecked: boolean) => {
    if (!userDocRef) return;
    setIsSaving(true);
    
    // Optimistic UI update
    const originalSelection = new Set(selectedServices);
    const newSelection = new Set(originalSelection);
    if (isChecked) {
        newSelection.add(seriesId);
    } else {
        newSelection.delete(seriesId);
    }
    setSelectedServices(newSelection);

    try {
      await updateDoc(userDocRef, {
        availableRecurringEventSeriesIds: isChecked ? arrayUnion(seriesId) : arrayRemove(seriesId),
      });
      toast.success("Your service preferences have been updated.");
    } catch (e: unknown) {
      toast.error("Failed to update preferences.");
      setSelectedServices(originalSelection); // Revert UI on error
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: "update",
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
        setIsSaving(false);
    }
  };

  const handleToggleRole = async (roleId: string, isChecked: boolean) => {
    if (!userDocRef) return;
    setIsSavingRole(true);
    
    const originalSelection = new Set(selectedRoles);
    const newSelection = new Set(originalSelection);
    if (isChecked) {
        newSelection.add(roleId);
    } else {
        newSelection.delete(roleId);
    }
    setSelectedRoles(newSelection);

    try {
      await updateDoc(userDocRef, {
        availableRoleIds: isChecked ? arrayUnion(roleId) : arrayRemove(roleId),
      });
      toast.success("Your role preferences have been updated.");
    } catch (e: unknown) {
      toast.error("Failed to update role preferences.");
      setSelectedRoles(originalSelection); // Revert UI on error
    } finally {
        setIsSavingRole(false);
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading || areServicesLoading;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background p-8">
      <div className="w-full max-w-2xl">
        <header className="mb-8">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">My Preferences</h1>
              {!isLoading && (
                <Badge variant="secondary" className="text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {selectedServices.size} service{selectedServices.size !== 1 ? "s" : ""} selected
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-2">
                Manage your availability and tell your admin which roles you can serve in so they can schedule you appropriately.
            </p>
            <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-muted/50 border text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Your admin uses these preferences to automatically match you to roles you&apos;re qualified for at services you attend.</span>
            </div>
        </header>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>My Roles</CardTitle>
            <CardDescription>
              Select the volunteering roles you are qualified for and willing to serve in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isUserLoading || isProfileLoading || areRolesLoading ? (
                <CardSkeleton />
            ) : roleTemplates && roleTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roleTemplates.map((role) => (
                        <div key={role.id} className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50">
                             <Checkbox
                                id={`role-${role.id}`}
                                checked={selectedRoles.has(role.id)}
                                onCheckedChange={(checked) => handleToggleRole(role.id, Boolean(checked))}
                                disabled={isSavingRole}
                            />
                            <Label htmlFor={`role-${role.id}`} className="text-base font-normal cursor-pointer flex-1">
                                {role.name}
                            </Label>
                        </div>
                    ))}
                </div>
            ) : (
                 <p className="text-muted-foreground text-center py-8">
                    Your church has not set up any general roles yet.
                </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recurring Services</CardTitle>
            <CardDescription>
              Select all the services you typically attend and are willing to be scheduled for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <CardSkeleton />
            ) : recurringServices && recurringServices.length > 0 ? (
                <div className="space-y-4">
                    {recurringServices.map((service) => (
                        <div key={service.seriesId} className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50">
                             <Checkbox
                                id={service.seriesId}
                                checked={selectedServices.has(service.seriesId)}
                                onCheckedChange={(checked) => handleToggleService(service.seriesId, Boolean(checked))}
                                disabled={isSaving}
                            />
                            <Label htmlFor={service.seriesId} className="text-base font-normal cursor-pointer flex-1">
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
           <CardFooter>
            <Button asChild variant="link">
              <Link href="/dashboard/volunteer">Back to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}