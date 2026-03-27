
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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

interface PendingProfile {
  firstName: string;
  lastName: string;
  churchId: string;
  isManagedByAdmin?: boolean;
  status?: "pending_invitation" | "active";
}

function ClaimAccount() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token"); // This is the user document ID

  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingProfile, setPendingProfile] = useState<PendingProfile | null>(null);

  useEffect(() => {
    if (isUserLoading) return;

    if (user) {
      // User is already signed in, just redirect them to the dashboard.
      router.replace("/dashboard");
      return;
    }

    if (!token || !firestore) {
      setError("This invitation link is invalid or has expired.");
      setIsLoading(false);
      return;
    }

    const checkToken = async () => {
      const userDocRef = doc(firestore, "users", token);
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().status === "pending_invitation") {
          setPendingProfile(userDoc.data() as PendingProfile);
        } else {
          setError("This invitation is no longer valid.");
        }
      } catch (e) {
        setError("Could not verify invitation. Please try again later.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    void checkToken();
  }, [token, firestore, router, user, isUserLoading]);

  const handleClaimWithGoogle = async () => {
    if (!auth || !firestore || !token || !pendingProfile) {
      toast.error("Initialization error. Please refresh the page.");
      return;
    }

    setIsLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const newUser = result.user;

      const finalUpdate = {
        email: newUser.email,
        photoURL: newUser.photoURL,
        status: "active" as const,
        isManagedByAdmin: false,
        id: newUser.uid, // Add the real UID to the document
      };

      const userDocToUpdateRef = doc(firestore, "users", token);

      await updateProfile(newUser, {
        displayName: `${pendingProfile.firstName} ${pendingProfile.lastName}`,
      });
      await updateDoc(userDocToUpdateRef, finalUpdate);

      const idToken = await newUser.getIdToken();
      await fetch(`/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      toast.success("Account claimed successfully! Redirecting...");
      router.push("/dashboard");
    } catch (e: unknown) {
      setIsLoading(false);
      toast.error((e as Error).message || "Failed to claim account.");
      console.error(e);
      if (token) {
        const permissionError = new FirestorePermissionError({
          path: `users/${token}`,
          operation: "update",
        });
        errorEmitter.emit("permission-error", permissionError);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Claim Your Account</CardTitle>
          {pendingProfile && (
            <CardDescription>
              You've been invited to join as {pendingProfile.firstName} {pendingProfile.lastName}.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isLoading || isUserLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <p className="text-destructive text-center">{error}</p>
          ) : pendingProfile ? (
            <div className="text-center">
              <p className="mb-6">Click below to sign in with Google and link your account.</p>
              <Button onClick={() => handleClaimWithGoogle()} className="w-full">
                <GoogleIcon className="mr-2 h-4 w-4" />
                Sign in with Google to Claim
              </Button>
            </div>
          ) : (
            <p className="text-destructive text-center">Could not find a valid invitation.</p>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to associate your Google account with the profile created by
            your administrator.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ClaimAccountPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClaimAccount />
    </Suspense>
  );
}
