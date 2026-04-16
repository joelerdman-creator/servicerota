
"use client";

import React, { useState } from "react";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { useAuth } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import {
  updateProfile,
  EmailAuthProvider,
  linkWithCredential,
  updatePassword,
  reauthenticateWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Upload, MessageSquare, ShieldCheck, Bell, Smartphone } from "lucide-react";
import { CardSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string | null;
  photoURL?: string;
  phone?: string;
  smsOptIn?: boolean;
  smsOptInAt?: any; // Firestore Timestamp
  eventReminderDays?: number[]; // volunteer's own reminder preferences, e.g. [3, 1]
}

/** Convert a US phone number string to E.164 format (+1XXXXXXXXXX). */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

/** Format an E.164 number for display: +18005551234 → (800) 555-1234 */
function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return e164;
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

  // SMS state
  const [phoneInput, setPhoneInput] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [isSavingSms, setIsSavingSms] = useState(false);

  // Event reminder preferences
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDay1, setReminderDay1] = useState("3");
  const [reminderDay2, setReminderDay2] = useState("");
  const [isSavingReminders, setIsSavingReminders] = useState(false);

  React.useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName);
      setLastName(userProfile.lastName);
      // Populate SMS fields from Firestore
      setPhoneInput(userProfile.phone ? formatPhoneDisplay(userProfile.phone) : "");
      setSmsOptIn(userProfile.smsOptIn ?? false);
      // Populate reminder preferences
      const erd = userProfile.eventReminderDays ?? [];
      setReminderEnabled(erd.length > 0);
      setReminderDay1(erd[0]?.toString() ?? "3");
      setReminderDay2(erd[1]?.toString() ?? "");
    }
  }, [userProfile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
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

  const handleSaveSms = async () => {
    if (!userDocRef) return;

    const rawPhone = phoneInput.trim();
    if (smsOptIn && !rawPhone) {
      toast.error("Please enter a phone number before enabling text notifications.");
      return;
    }

    const e164Phone = rawPhone ? toE164(rawPhone) : "";
    const digits = e164Phone.replace(/\D/g, "");
    if (rawPhone && digits.length < 10) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    setIsSavingSms(true);
    try {
      const previousOptIn = userProfile?.smsOptIn ?? false;
      const optInChanged = smsOptIn !== previousOptIn;

      const updateData: Record<string, any> = {
        phone: e164Phone || null,
        smsOptIn,
        // If opting IN: record the timestamp; if opting OUT: clear it
        smsOptInAt: smsOptIn ? serverTimestamp() : null,
      };

      // Append an audit entry whenever the opt-in status changes
      if (optInChanged) {
        updateData.smsOptInHistory = arrayUnion({
          optedIn: smsOptIn,
          phone: e164Phone || null,
          at: new Date().toISOString(), // ISO string since serverTimestamp() can't go inside arrayUnion
        });
      }

      await updateDoc(userDocRef, updateData);
      toast.success("Text notification preferences saved!");
    } catch (error) {
      console.error("SMS pref save error:", error);
      toast.error("Failed to save preferences.");
    } finally {
      setIsSavingSms(false);
    }
  };

  const handleSaveReminders = async () => {
    if (!userDocRef) return;
    setIsSavingReminders(true);
    try {
      const days: number[] = [];
      const d1 = parseInt(reminderDay1);
      const d2 = parseInt(reminderDay2);
      if (reminderEnabled && !isNaN(d1) && d1 > 0) days.push(d1);
      if (reminderEnabled && !isNaN(d2) && d2 > 0) days.push(d2);
      await updateDoc(userDocRef, { eventReminderDays: days });
      toast.success("Reminder preferences saved!");
    } catch {
      toast.error("Failed to save reminder preferences.");
    } finally {
      setIsSavingReminders(false);
    }
  };

  const getInitials = (first = "", last = "") =>
    `${first[0] || ""}${last[0] || ""}`.toUpperCase();

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
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background p-8">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader
          title="My Profile"
          description="Update your personal information and notification preferences."
          backHref="/dashboard/volunteer"
          backLabel="Dashboard"
        />

        {/* ── Profile Details Card ─────────────────────────────────────── */}
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
                    <input id="photo-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange} />
                  </label>
                </Button>
              </div>
              <div className="flex-1 space-y-2">
                {photoFile && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                    <p className="text-sm truncate flex-1">{photoFile.name}</p>
                    <Button onClick={handleUpload} size="sm" disabled={isUploading}>
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
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

        {/* ── Text Notifications Card ───────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle>Text Notifications</CardTitle>
            </div>
            <CardDescription>
              Receive SMS messages when you are assigned, a substitution is available, or a trade is accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 555-5555"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">US numbers only. Standard message & data rates may apply.</p>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="sms-opt-in" className="text-base font-medium cursor-pointer">
                    Enable text message notifications
                  </Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    By enabling this, I consent to receive recurring automated SMS text messages
                    from <strong>Parish Scribe (Joel Erdman dba ParishScribe)</strong> including
                    assignment confirmations, service reminders, and substitution requests.
                  </p>
                </div>
                <Switch
                  id="sms-opt-in"
                  checked={smsOptIn}
                  onCheckedChange={setSmsOptIn}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Message and data rates may apply. Message frequency varies (typically 2–8/month).
                Reply <strong>STOP</strong> to cancel, <strong>HELP</strong> for help.
                Consent is not required to use Parish Scribe. See our{" "}
                <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>
                {" "}and{" "}
                <a href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms of Service</a>.
              </p>
            </div>

            {userProfile?.smsOptIn && userProfile?.smsOptInAt && (
              <div className="flex items-start gap-2 rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                <span>
                  You consented to receive text messages on{" "}
                  {userProfile.smsOptInAt?.toDate
                    ? userProfile.smsOptInAt.toDate().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                    : "a recorded date"}
                  .
                </span>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveSms} disabled={isSavingSms}>
              {isSavingSms ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Notification Preferences
            </Button>
          </CardFooter>
        </Card>

        {/* ── Event Reminder Preferences Card ─────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Event Reminders</CardTitle>
            </div>
            <CardDescription>
              Get a heads-up before the events you&apos;re scheduled to serve at. Your church may also send reminders — these are your personal preferences on top of that.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="reminder-toggle" className="text-base font-medium cursor-pointer">
                  Send me event reminders
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  We&apos;ll email (and text, if enabled) you before your upcoming assignments.
                </p>
              </div>
              <Switch
                id="reminder-toggle"
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
              />
            </div>

            {reminderEnabled && (
              <div className="space-y-4 pl-1">
                <p className="text-sm text-muted-foreground">
                  Choose up to 2 reminders. Leave the second blank for just one.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vol-reminder-1">First reminder</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="vol-reminder-1"
                        type="number"
                        min={1}
                        max={14}
                        value={reminderDay1}
                        onChange={(e) => setReminderDay1(e.target.value)}
                        className="w-16 h-9 rounded-md border border-input bg-background px-3 text-sm text-center"
                        placeholder="3"
                      />
                      <span className="text-sm text-muted-foreground">days before</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vol-reminder-2">Second reminder <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="vol-reminder-2"
                        type="number"
                        min={1}
                        max={14}
                        value={reminderDay2}
                        onChange={(e) => setReminderDay2(e.target.value)}
                        className="w-16 h-9 rounded-md border border-input bg-background px-3 text-sm text-center"
                        placeholder="—"
                      />
                      <span className="text-sm text-muted-foreground">days before</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveReminders} disabled={isSavingReminders}>
              {isSavingReminders ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Reminder Preferences
            </Button>
          </CardFooter>
        </Card>

        {/* ── Mobile App Access Card ───────────────────────────────────── */}
        <MobilePasswordCard user={user} />

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile App Access — lets Google-only accounts set a password so they can
// sign in to the Parish Scribe mobile app with email + password.
// ---------------------------------------------------------------------------
function MobilePasswordCard({ user }: { user: any }) {
  const hasPasswordProvider = user?.providerData?.some(
    (p: any) => p.providerId === "password",
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      if (hasPasswordProvider) {
        // Already linked — just update the password.
        // Requires recent sign-in; re-auth with Google first.
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
        await updatePassword(user, newPassword);
      } else {
        // Link email/password provider to the existing Google account.
        const credential = EmailAuthProvider.credential(user.email!, newPassword);
        await linkWithCredential(user, credential);
      }
      toast.success("Password set! You can now sign in to the mobile app.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      if (e.code === "auth/requires-recent-login") {
        toast.error("Please sign out and sign back in, then try again.");
      } else {
        toast.error(e.message || "Failed to set password.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Mobile App Access
        </CardTitle>
        <CardDescription>
          {hasPasswordProvider
            ? "Your account already has a password set for mobile app sign-in. You can update it here."
            : "Set a password to sign in to the Parish Scribe mobile app with your email address."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">
            {hasPasswordProvider ? "New Password" : "Create Password"}
          </Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSetPassword} disabled={isSaving || !newPassword || !confirmPassword}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {hasPasswordProvider ? "Update Password" : "Set Password"}
        </Button>
      </CardFooter>
    </Card>
  );
}

