
"use client";

import { useState } from "react";
import { useFirestore, useDoc, useCollection } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useParams } from "next/navigation";

interface UserProfile {
  id?: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
  servingPreference?: "ANY_TIME" | "PREFER_FAMILY" | "ONLY_WITH_FAMILY";
  familyId?: string;
  churchId?: string;
  status?: "active" | "pending_approval";
  isHouseholdManager?: boolean;
}

export default function AdminManageFamilyPage() {
  const { volunteerId } = useParams();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Member Dialog State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberFirstName, setNewMemberFirstName] = useState("");
  const [newMemberLastName, setNewMemberLastName] = useState("");

  const managedUserDocRef = useMemoFirebase(
    () => (firestore && volunteerId ? doc(firestore, "users", volunteerId as string) : null),
    [firestore, volunteerId],
  );
  const { data: managedUserProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(managedUserDocRef);

  // Fetch Family Members
  const familyQuery = useMemoFirebase(() => {
    if (!firestore || !managedUserProfile?.familyId || !managedUserProfile?.churchId) return null;

    return query(
      collection(firestore, "users"),
      where("familyId", "==", managedUserProfile.familyId),
      where("churchId", "==", managedUserProfile.churchId),
    );
  }, [firestore, managedUserProfile?.familyId, managedUserProfile?.churchId]);

  const { data: familyMembers, isLoading: isFamilyLoading } =
    useCollection<UserProfile>(familyQuery);

  const handlePreferenceChange = async (
    preference: "ANY_TIME" | "PREFER_FAMILY" | "ONLY_WITH_FAMILY",
  ) => {
    if (!managedUserDocRef) return;
    setIsSubmitting(true);

    const updateData = { servingPreference: preference };

    try {
      await updateDoc(managedUserDocRef, updateData);
      toast.success("Serving preference has been updated.");
    } catch (e: unknown) {
      toast.error("Failed to update preference.");
      const permissionError = new FirestorePermissionError({
        path: managedUserDocRef.path,
        operation: "update",
        requestResourceData: updateData,
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFamilyMember = async () => {
    if (
      !firestore ||
      !managedUserProfile ||
      !managedUserProfile.churchId ||
      !managedUserProfile.id
    ) {
      toast.error("The volunteer's profile is not fully configured to add family members.");
      return;
    }
    if (!newMemberFirstName.trim() || !newMemberLastName.trim()) {
      toast.error("Please enter a first and last name.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Adding family member...");
    const batch = writeBatch(firestore);

    // If the managed user doesn't have a family, they become the household manager of a new family.
    const familyId = managedUserProfile.familyId || managedUserProfile.id;

    if (!managedUserProfile.familyId) {
      const currentUserRef = doc(firestore, "users", managedUserProfile.id);
      batch.update(currentUserRef, {
        familyId,
        isHouseholdManager: true,
      });
    }

    const newMemberData = {
      firstName: newMemberFirstName.trim(),
      lastName: newMemberLastName.trim(),
      email: null,
      familyId,
      churchId: managedUserProfile.churchId,
      isHouseholdManager: false,
      status: "pending_approval" as const,
      servingPreference: "ANY_TIME" as const,
      createdAt: serverTimestamp(),
    };

    const newMemberRef = doc(collection(firestore, "users"));
    batch.set(newMemberRef, newMemberData);

    try {
      await batch.commit();
      toast.success("Family member submitted for approval.", { id: loadingToast });
      setIsAddMemberOpen(false);
      setNewMemberFirstName("");
      setNewMemberLastName("");
    } catch (e: unknown) {
      console.error("Add Family Member Error:", e);
      toast.error("Failed to add family member.", { id: loadingToast });
      const permissionError = new FirestorePermissionError({
        path: "users collection batch write",
        operation: "create",
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (firstName = "", lastName = "") => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  // Admins can always add members when managing another user
  const canAddMembers = true;
  const isLoading = isProfileLoading || isFamilyLoading;

  return (
    <>
      <div className="flex flex-col items-center justify-start min-h-screen bg-background p-8">
        <div className="w-full max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Family Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage this volunteer&apos;s family serving preferences and view members.
            </p>
          </header>

          {isLoading ? (
            <p>Loading family details...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <Card>
                <CardHeader>
                  <CardTitle>Serving Preferences</CardTitle>
                  <CardDescription>
                    How would this volunteer like to be scheduled with their family?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    defaultValue={managedUserProfile?.servingPreference || "ANY_TIME"}
                    onValueChange={(value) =>
                      handlePreferenceChange(
                        value as "ANY_TIME" | "PREFER_FAMILY" | "ONLY_WITH_FAMILY",
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ANY_TIME" id="any-time" />
                      <Label htmlFor="any-time">Serve any time</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PREFER_FAMILY" id="prefer-family" />
                      <Label htmlFor="prefer-family">Serve with family if possible</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ONLY_WITH_FAMILY" id="only-with-family" />
                      <Label htmlFor="only-with-family">Only serve with family members</Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Family Members</CardTitle>
                  <CardDescription>Add or view members of this household.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isFamilyLoading && <p>Loading family members...</p>}
                  {!isFamilyLoading && (!familyMembers || familyMembers.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No family members found.
                    </p>
                  )}
                  {familyMembers?.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={member.photoURL}
                            alt={`${member.firstName} ${member.lastName}`}
                          />
                          <AvatarFallback>
                            {getInitials(member.firstName, member.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {member.firstName} {member.lastName}
                            {member.isHouseholdManager && (
                              <div title="Household Manager">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                              </div>
                            )}
                          </p>
                          {member.status === "pending_approval" && (
                            <Badge variant="secondary">Pending Approval</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsAddMemberOpen(true)}
                    disabled={!canAddMembers}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Family Member
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a New Family Member</DialogTitle>
            <DialogDescription>
              This will create a new user profile linked to this family and church. You will need to
              approve this request from the main volunteer list before they can be assigned to
              roles.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="first-name" className="text-right">
                First Name
              </Label>
              <Input
                id="first-name"
                value={newMemberFirstName}
                onChange={(e) => setNewMemberFirstName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="last-name" className="text-right">
                Last Name
              </Label>
              <Input
                id="last-name"
                value={newMemberLastName}
                onChange={(e) => setNewMemberLastName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" onClick={() => handleAddFamilyMember()} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
