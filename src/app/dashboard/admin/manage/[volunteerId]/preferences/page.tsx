
"use client";

import { useState, useEffect } from "react";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, errorEmitter, WithId } from "@/firebase";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, getDocs, where, limit } from "firebase/firestore";


interface UserProfile {
  churchId?: string;
  availableRecurringEventSeriesIds?: string[];
}

interface RecurringService {
  seriesId: string;
  eventName: string;
}

export default function AdminManagePreferencesPage() {
  const { volunteerId } = useParams();
  const firestore = useFirestore();

  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // --- Data Fetching ---
  const volunteerDocRef = useMemoFirebase(
    () => (firestore && volunteerId ? doc(firestore, "users", volunteerId as string) : null),
    [firestore, volunteerId],
  );
  const { data: volunteerProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(volunteerDocRef);

  const [recurringServices, setRecurringServices] = useState<RecurringService[]>([]);
  const [areServicesLoading, setAreServicesLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !volunteerProfile?.churchId) return;

    const fetchRecurringServices = async () => {
      setAreServicesLoading(true);
      const q = query(
        collection(firestore, `churches/${volunteerProfile.churchId}/events`),
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
  }, [firestore, volunteerProfile?.churchId]);

  useEffect(() => {
    if (volunteerProfile?.availableRecurringEventSeriesIds) {
      setSelectedServices(new Set(volunteerProfile.availableRecurringEventSeriesIds));
    }
  }, [volunteerProfile]);
  
  const handleToggleService = async (seriesId: string, isChecked: boolean) => {
    if (!volunteerDocRef) return;
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
      await updateDoc(volunteerDocRef, {
        availableRecurringEventSeriesIds: isChecked ? arrayUnion(seriesId) : arrayRemove(seriesId),
      });
      toast.success("Preferences have been updated.");
    } catch (e: unknown) {
      toast.error("Failed to update preferences.");
      setSelectedServices(originalSelection); // Revert UI on error
      const permissionError = new FirestorePermissionError({
        path: volunteerDocRef.path,
        operation: "update",
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
        setIsSaving(false);
    }
  };
  
  const isLoading = isProfileLoading || areServicesLoading;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background p-8">
      <div className="w-full max-w-2xl">
        <header className="mb-8">
            <h1 className="text-3xl font-bold">Manage Serving Preferences</h1>
            <p className="text-muted-foreground mt-2">
                Select the recurring services this volunteer is available to serve at.
            </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Recurring Services</CardTitle>
            <CardDescription>
              Select all the services this volunteer typically attends and is willing to be scheduled for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
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
                            <Label htmlFor={service.seriesId} className="text-base font-normal cursor-pointer">
                                {service.eventName}
                            </Label>
                        </div>
                    ))}
                </div>
            ) : (
                 <p className="text-muted-foreground text-center py-8">
                    This church has not set up any recurring services yet.
                </p>
            )}
          </CardContent>
           <CardFooter>
            <Button asChild variant="link">
              <Link href={`/dashboard/admin/manage/${volunteerId}`}>Back to Volunteer Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
