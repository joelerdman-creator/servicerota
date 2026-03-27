
"use client";

import React, { useState } from "react";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { useAuth } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Upload } from "lucide-react";
import { CardSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string | null;
  photoURL?: string;
}

export default function VolunteerProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore!, "users", user.uid) : null),
    [user, firestore],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const [firstName, setFirstName] = useState(userProfile?.firstName || "");
  const [lastName, setLastName] = useState(userProfile?.lastName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  React.useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName);
      setLastName(userProfile.lastName);
    }
  }, [userProfile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error("File is too large. Max 2MB.");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };
  
  const handleUpload = async () => {
    if (!photoFile || !user) {
        toast.error("No photo selected.");
        return;
    }
    setIsUploading(true);
    const toastId = toast.loading("Uploading photo...");
    try {
        const storage = getStorage();
        const filePath = `avatars/${user.uid}/${photoFile.name}`;
        const storageRef = ref(storage, filePath);

        const snapshot = await uploadBytes(storageRef, photoFile);
        const downloadURL = await getDownloadURL(snapshot.ref);

        await updateProfile(user, { photoURL: downloadURL });
        if (userDocRef) {
            await updateDoc(userDocRef, { photoURL: downloadURL });
        }
        
        toast.success("Profile photo updated!", { id: toastId });
        setPhotoFile(null);
        setPhotoPreview(null);
    } catch (error) {
        console.error("Photo upload error:", error);
        toast.error("Failed to upload photo.", { id: toastId });
    } finally {
        setIsUploading(false);
    }
  };


  const handleSave = async () => {
    if (!user || !userDocRef) {
      toast.error("User not found.");
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile(user, { displayName: `${firstName} ${lastName}` });
      await updateDoc(userDocRef, { firstName, lastName });
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (first = "", last = "") => {
    return `${first[0] || ""}${last[0] || ""}`.toUpperCase();
  };

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-start min-h-screen bg-background p-8">
        <div className="w-full max-w-2xl space-y-4">
          <div className="mb-8 space-y-2">
            <div className="h-8 w-1/3 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-2/3 rounded-md bg-muted animate-pulse" />
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background p-8">
        <div className="w-full max-w-2xl">
        <header className="mb-8">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground mt-2">
                Update your personal information and profile picture.
            </p>
        </header>

        <Card>
            <CardHeader>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>Manage your name, email, and photo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={photoPreview || user?.photoURL || ""} alt={user?.displayName || ""} />
                            <AvatarFallback className="text-3xl">{getInitials(firstName, lastName)}</AvatarFallback>
                        </Avatar>
                        <Button asChild size="icon" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full">
                            <label htmlFor="photo-upload">
                                <Upload className="h-4 w-4" />
                                <input id="photo-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange}/>
                            </label>
                        </Button>
                    </div>
                    <div className="flex-1 space-y-2">
                         {photoFile && (
                            <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                                <p className="text-sm truncate flex-1">{photoFile.name}</p>
                                <Button onClick={handleUpload} size="sm" disabled={isUploading}>
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Upload"}
                                </Button>
                            </div>
                         )}
                         <p className="text-xs text-muted-foreground">Upload a new profile picture. Max 2MB.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ""} readOnly disabled />
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                </Button>
            </CardContent>
        </Card>
        <footer className="mt-8 flex justify-center">
            <Button asChild variant="link">
              <Link href="/dashboard/volunteer">Back to Dashboard</Link>
            </Button>
          </footer>
        </div>
    </div>
  );
}
