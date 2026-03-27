
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";

// Simplified status component for loading display
function LoadingStatus({ status }: { status: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      <p className="text-muted-foreground font-medium">{status}</p>
    </div>
  );
}

// Simplified error component
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center">
      <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md max-w-md w-full text-sm text-destructive-foreground">
        <p className="font-bold">An error occurred:</p>
        <p>{error}</p>
        <p className="mt-2 text-xs">
          Please check the debug console for details. This may be a Firestore security rule issue or a network problem.
        </p>
      </div>
    </div>
  );
}

// This component acts as a router for authenticated users.
export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until Firebase auth and Firestore are initialized
    if (isUserLoading || !firestore) {
      return;
    }

    // If there's no user, redirect to the login page.
    if (!user) {
      router.replace("/login");
      return;
    }

    const routeUser = async () => {
      const userDocRef = doc(firestore, "users", user.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        let userData = userDoc.exists() ? userDoc.data() : null;
        
        if (!userDoc.exists()) {
          // Create a new user profile if it doesn't exist
          const profileData = {
            id: user.uid,
            email: user.email,
            firstName: user.displayName?.split(" ")[0] || "",
            lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
            createdAt: serverTimestamp(),
            role: null,
            isAdmin: false,
            churchId: null,
          };
          await setDoc(userDocRef, profileData);
          userData = profileData;
        }

        const role = userData?.role;
        const churchId = userData?.churchId;

        // Determine the redirect path based on user role and church status
        if (role === "admin" && !churchId) {
          router.replace("/dashboard/role-selection");
        } else if (role === "admin") {
          const churchDoc = await getDoc(doc(firestore, "churches", churchId));
          const onboardingCompleted = churchDoc.data()?.onboardingCompleted;

          if (churchDoc.exists() && !onboardingCompleted) {
            router.replace("/dashboard/onboarding");
          } else {
            router.replace("/dashboard/admin");
          }
        } else if (role === "volunteer") {
          router.replace("/dashboard/volunteer");
        } else {
          router.replace("/dashboard/role-selection");
        }
      } catch (e: any) {
        console.error("Dashboard Page - Error routing user:", e);
        // Emit a global error for the listener, and set a local error for UI
        const permissionError = new FirestorePermissionError({ path: userDocRef.path, operation: "get" });
        errorEmitter.emit("permission-error", permissionError);
        setError(`Failed to read your user profile. This might be a permission issue.`);
      }
    };

    routeUser();
  }, [user, isUserLoading, firestore, router]);

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return <LoadingStatus status="Initializing and routing..." />;
}
