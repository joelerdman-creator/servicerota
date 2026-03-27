
"use client";

import { useState, useMemo } from "react";
import { useFirestore, useDoc, useCollection } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import {
  doc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  collection,
  query,
  where,
} from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { useParams } from "next/navigation";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
  unavailability?: string[]; // Array of YYYY-MM-DD strings
  familyId?: string;
}

// Custom styles for the calendar
const css = `
  .rdp-day_unavailable { 
    font-weight: bold; 
    color: hsl(var(--destructive));
  }
`;

export default function AdminManageAvailabilityPage() {
  const { volunteerId } = useParams();
  const firestore = useFirestore();

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Data Fetching ---
  const managedUserDocRef = useMemoFirebase(
    () => (firestore && volunteerId ? doc(firestore, "users", volunteerId as string) : null),
    [firestore, volunteerId],
  );
  const { data: managedUserProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(managedUserDocRef);

  const familyQuery = useMemoFirebase(() => {
    if (!firestore || !managedUserProfile?.familyId) return null;
    return query(
      collection(firestore, "users"),
      where("familyId", "==", managedUserProfile.familyId),
    );
  }, [firestore, managedUserProfile?.familyId]);
  const { data: familyMembers, isLoading: isFamilyLoading } =
    useCollection<UserProfile>(familyQuery);

  // --- Memoized Derived State ---
  const allUnavailableDates = useMemo(() => {
    const dates = new Set<string>();
    familyMembers?.forEach((member) => {
      member.unavailability?.forEach((dateStr) => dates.add(dateStr));
    });
    return Array.from(dates).map((dateStr) => new Date(`${dateStr}T12:00:00`)); // Use noon to avoid timezone issues
  }, [familyMembers]);

  const getInitials = (firstName = "", lastName = "") => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  // --- Handlers ---
  const handleDateSelect = (dates: Date[] | undefined) => {
    setSelectedDates(dates || []);
  };

  const toggleFamilyMember = (id: string) => {
    setSelectedFamilyMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllFamily = () => {
    if (familyMembers) {
      setSelectedFamilyMembers(new Set(familyMembers.map((m) => m.id)));
    }
  };

  const handleApplyUnavailability = async (action: "add" | "remove") => {
    if (!firestore || selectedDates.length === 0 || selectedFamilyMembers.size === 0) {
      toast.error("Please select at least one date and one person.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(
      `${action === "add" ? "Adding" : "Removing"} unavailable dates...`,
    );

    const dateStrings = selectedDates.map((d) => format(d, "yyyy-MM-dd"));
    const batch = writeBatch(firestore);

    for (const memberId of Array.from(selectedFamilyMembers)) {
      const memberDocRef = doc(firestore, "users", memberId);
      batch.update(memberDocRef, {
        unavailability: action === "add" ? arrayUnion(...dateStrings) : arrayRemove(...dateStrings),
      });
    }

    try {
      await batch.commit();
      toast.success(`Dates ${action === "add" ? "added" : "removed"} successfully!`, {
        id: loadingToast,
      });
      setSelectedDates([]);
      setSelectedFamilyMembers(new Set());
    } catch (e: unknown) {
      toast.error("Failed to update availability.", { id: loadingToast });
      console.error(e);
      const permissionError = new FirestorePermissionError({
        path: "users collection batch update",
        operation: "update",
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isProfileLoading || isFamilyLoading;

  return (
    <>
      <style>{css}</style>
      <div className="flex flex-col items-center justify-start min-h-screen bg-background p-8">
        <div className="w-full max-w-5xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Manage Availability</h1>
            <p className="text-muted-foreground mt-2">
              Select dates on the calendar when this volunteer or their family are unavailable to
              serve.
            </p>
          </header>

          {isLoading ? (
            <p>Loading availability...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Calendar */}
              <Card className="lg:col-span-2">
                <CardContent className="p-2 sm:p-6 flex justify-center">
                  <DayPicker
                    mode="multiple"
                    min={1}
                    selected={selectedDates}
                    onSelect={handleDateSelect}
                    modifiers={{ unavailable: allUnavailableDates }}
                    modifiersClassNames={{
                      unavailable: "rdp-day_unavailable",
                    }}
                    className="w-full"
                  />
                </CardContent>
              </Card>

              {/* Management Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Manage Dates</CardTitle>
                  <CardDescription>Apply selected dates to family members.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="font-medium text-sm mb-2">Selected Dates:</p>
                    <div className="text-sm text-muted-foreground min-h-[20px]">
                      {selectedDates.length > 0
                        ? selectedDates.map((d) => format(d, "MMM d")).join(", ")
                        : "None selected"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-medium text-sm">For Whom:</p>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={selectAllFamily}
                      >
                        Select All
                      </Button>
                    </div>
                    {isFamilyLoading && <p>Loading family...</p>}
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 -mr-2">
                      {familyMembers?.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => toggleFamilyMember(member.id)}
                        >
                          <Checkbox
                            id={`member-${member.id}`}
                            checked={selectedFamilyMembers.has(member.id)}
                            onCheckedChange={() => toggleFamilyMember(member.id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.photoURL} />
                            <AvatarFallback>
                              {getInitials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <Label htmlFor={`member-${member.id}`} className="cursor-pointer">
                            {member.firstName} {member.lastName}
                          </Label>
                        </div>
                      ))}
                      {familyMembers?.length === 0 && (
                        <p className="text-muted-foreground text-sm">No family members found.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    onClick={() => handleApplyUnavailability("add")}
                    disabled={
                      isSubmitting || selectedDates.length === 0 || selectedFamilyMembers.size === 0
                    }
                  >
                    Mark as Unavailable
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleApplyUnavailability("remove")}
                    disabled={
                      isSubmitting || selectedDates.length === 0 || selectedFamilyMembers.size === 0
                    }
                  >
                    Mark as Available
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
