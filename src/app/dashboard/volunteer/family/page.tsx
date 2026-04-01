
"use client";

import { useState } from "react";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
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
import type { addDoc } from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
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

export default function FamilyPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Member Dialog State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberFirstName, setNewMemberFirstName] = useState("");
  const [newMemberLastName, setNewMemberLastName] = useState("");

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const familyQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.familyId || !userProfile?.churchId) return null;
    return query(
      collection(firestore, "users"),
      where("familyId", "==", userProfile.familyId),
      where("churchId", "==", userProfile.churchId),
    );
  }, [firestore, userProfile?.familyId, userProfile?.churchId]);

  const { data: familyMembers, isLoading: isFamilyLoading } =
    useCollection<UserProfile>(familyQuery);

  const handlePreferenceChange = async (
    preference: "ANY_TIME" | "PREFER_FAMILY" | "ONLY_WITH_FAMILY",
  ) => {
    if (!userDocRef) return;
    setIsSubmitting(true);

    const updateData = { servingPreference: preference };

    try {
      await updateDoc(userDocRef, updateData);
      toast.success("Your serving preference has been updated.");
    } catch (e) {
      toast.error("Failed to update preference.");
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: "update",
        requestResourceData: updateData,
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFamilyMember = async () => {
    if (!firestore || !user || !userProfile || !userProfile.churchId) {
      toast.error("Your user profile is not fully configured to add family members.");
      return;
    }
    if (!newMemberFirstName.trim() || !newMemberLastName.trim()) {
      toast.error("Please enter a first and last name.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Adding family member...");
    const batch = writeBatch(firestore);

    const familyId = userProfile.familyId || user.uid;

    if (!userProfile.familyId) {
      const currentUserRef = doc(firestore, "users", user.uid);
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
      churchId: userProfile.churchId,
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
    } catch (e) {
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

  const canAddMembers = userProfile?.isHouseholdManager === true || !userProfile?.familyId;
  const isLoading = isUserLoading || isProfileLoading || (userProfile?.familyId && isFamilyLoading);

  return (
    <>
      <div className="flex flex-col items-center justify-start min-h-screen bg-background p-8">
        <div className="w-full max-w-4xl">
          <PageHeader
            title="Family Management"
            description="Manage your family's serving preferences and view members."
            backHref="/dashboard/volunteer"
            backLabel="Dashboard"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <Card>
              <CardHeader>
                <CardTitle>Serving Preferences</CardTitle>
                <CardDescription>
                  How would you like to be scheduled with your family?
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    Loading...
                  </div>
                ) : (
                  <RadioGroup
                    defaultValue={userProfile?.servingPreference || "ANY_TIME"}
                    onValueChange={handlePreferenceChange}
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
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Family Members</CardTitle>
                <CardDescription>Add or view members of your household.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    Loading...
                  </div>
                )}
                {!isLoading && (!familyMembers || familyMembers.length === 0) && !userProfile?.familyId && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    You haven't created a family group yet.
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
                              <ShieldCheck className="h-4 w-4 text-brand-accent" />
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
                  disabled={isLoading || !canAddMembers}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Family Member
                </Button>
                {!isLoading && !canAddMembers && (
                  <p className="text-xs text-muted-foreground text-center">
                    Only the household manager can add new family members.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a New Family Member</DialogTitle>
            <DialogDescription>
              This will create a new user profile linked to your family and church. An administrator
              will need to approve this request before they can be assigned to roles.
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
            <Button type="submit" onClick={handleAddFamilyMember} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
