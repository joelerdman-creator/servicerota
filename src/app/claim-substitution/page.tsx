
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth, useUser, useFirestore, WithId } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/icons/google";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { sendNotification } from "@/ai/flows/send-notification-flow";

// --- TYPES ---
interface Role {
  id: string;
  roleName: string;
  assignedVolunteerId: string | null;
  originalVolunteerId?: string | null;
  status: "Pending" | "Confirmed" | "Declined" | "Pending Substitution";
}
interface Event {
  eventName: string;
  eventDate: string;
}
interface ChurchProfile {
  name?: string;
}

function ClaimSubstitution() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract params from URL
  const churchId = searchParams.get("churchId");
  const eventId = searchParams.get("eventId");
  const roleId = searchParams.get("roleId");

  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleToClaim, setRoleToClaim] = useState<WithId<Role> | null>(null);
  const [eventDetails, setEventDetails] = useState<Event | null>(null);

  // Effect to fetch role and event details
  useEffect(() => {
    if (!churchId || !eventId || !roleId || !firestore) {
      setError("This substitution link is invalid or has expired.");
      setIsLoading(false);
      return;
    }

    const fetchDetails = async () => {
      const eventRef = doc(firestore, `churches/${churchId}/events/${eventId}`);
      const roleRef = doc(firestore, `churches/${churchId}/events/${eventId}/roles/${roleId}`);

      try {
        const [eventSnap, roleSnap] = await Promise.all([getDoc(eventRef), getDoc(roleRef)]);

        if (!eventSnap.exists() || !roleSnap.exists()) {
          throw new Error("The event or role no longer exists.");
        }

        const roleData = { id: roleSnap.id, ...roleSnap.data() } as WithId<Role>;

        if (roleData.status !== "Pending Substitution") {
          throw new Error("This substitution is no longer available.");
        }

        setEventDetails(eventSnap.data() as Event);
        setRoleToClaim(roleData);
      } catch (e: any) {
        console.error("Fetch substitution error:", e);
        setError(e.message || "Could not verify the substitution request.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [churchId, eventId, roleId, firestore]);

  const handleClaimRole = async () => {
    if (!user || !roleToClaim || !churchId || !eventId || !roleId || !firestore) {
      toast.error("An unexpected error occurred. Please try again.");
      return;
    }

    setIsLoading(true);
    const roleRef = doc(firestore, `churches/${churchId}/events/${eventId}/roles/${roleId}`);

    try {
      // Re-fetch the role to ensure it's still available (transaction-like check)
      const freshRoleSnap = await getDoc(roleRef);
      if (!freshRoleSnap.exists() || freshRoleSnap.data().status !== "Pending Substitution") {
        throw new Error("Sorry, this role has just been taken by someone else.");
      }

      const freshRoleData = freshRoleSnap.data() as Role;

      const updateData = {
        assignedVolunteerId: user.uid,
        assignedVolunteerName: user.displayName,
        status: "Confirmed",
        originalVolunteerId: null, // Clear the field
      };

      await updateDoc(roleRef, updateData);

      // Notify the original volunteer that their sub has been filled
      if (freshRoleData.originalVolunteerId && eventDetails) {
        try {
          const originalUserSnap = await getDoc(doc(firestore, "users", freshRoleData.originalVolunteerId));
          const churchSnap = await getDoc(doc(firestore, "churches", churchId));
          if (originalUserSnap.exists()) {
            const originalUser = originalUserSnap.data() as { firstName?: string; lastName?: string; email?: string | null; phone?: string; smsOptIn?: boolean };
            const church = churchSnap.exists() ? churchSnap.data() as ChurchProfile : null;
            if (originalUser.email) {
              void sendNotification({
                type: "substitution_claimed",
                toEmail: originalUser.email,
                toPhone: originalUser.phone,
                smsOptIn: originalUser.smsOptIn,
                originalVolunteerName: `${originalUser.firstName || ""} ${originalUser.lastName || ""}`,
                claimedByName: user.displayName || "A volunteer",
                eventName: eventDetails.eventName,
                eventDate: eventDetails.eventDate,
                roleName: roleToClaim.roleName,
                churchName: church?.name || "your church",
                loginUrl: `${window.location.origin}/dashboard`,
                churchId,
              });
            }
          }
        } catch (notifyErr) {
          console.error("Failed to notify original volunteer:", notifyErr);
        }
      }

      toast.success("You've successfully claimed the role! Redirecting...");
      router.push("/dashboard/volunteer/schedule");
    } catch (e: any) {
      setError(e.message || "Failed to claim role.");
      toast.error(e.message || "Failed to claim role.");
      const permissionError = new FirestorePermissionError({
        path: roleRef.path,
        operation: "update",
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInAndClaim = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // The onAuthStateChanged in the provider will handle session creation.
      // The component will re-render with a user, and they can then click "Claim Role".
      toast.success("Signed in! You can now claim the role.");
    } catch (e: any) {
      toast.error(e.message || "Failed to sign in with Google.");
    }
  };

  if (isLoading || isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-2">Verifying substitution request...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Request Invalid</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Claim Substitution Role</CardTitle>
          {eventDetails && roleToClaim && (
            <CardDescription>
              You are about to sign up for the <strong>{roleToClaim.roleName}</strong> role.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-md border bg-muted">
            <p className="font-semibold">{eventDetails?.eventName}</p>
            <p className="text-sm text-muted-foreground">
              {eventDetails?.eventDate &&
                format(parseISO(eventDetails.eventDate), "EEEE, MMMM do, yyyy 'at' h:mm a")}
            </p>
          </div>
          {user ? (
            <Button onClick={handleClaimRole} className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm and Claim Role
            </Button>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm">You must be signed in to claim this role.</p>
              <Button onClick={handleSignInAndClaim} className="w-full" disabled={isLoading}>
                <GoogleIcon className="mr-2 h-4 w-4" />
                Sign in with Google
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Once confirmed, you will be assigned to this role and the schedule will be updated.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ClaimSubstitutionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
      <ClaimSubstitution />
    </Suspense>
  );
}
