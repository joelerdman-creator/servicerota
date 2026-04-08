"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/firebase";
import { signInWithCustomToken } from "firebase/auth";
import { Button } from "./ui/button";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

const impersonationSessionKey = "impersonation_active";
const originalUserSessionKey = "original_user_session";

export function ImpersonationBanner() {
  const [impersonatedUser, setImpersonatedUser] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    const impersonating = sessionStorage.getItem(impersonationSessionKey);
    setImpersonatedUser(impersonating);

    const handleStorageChange = () => {
      setImpersonatedUser(sessionStorage.getItem(impersonationSessionKey));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleReturnToSuperUser = async () => {
    if (!auth) return;
    setIsReturning(true);
    const returnToast = toast.loading("Returning to Super User account...");

    try {
      const stored = sessionStorage.getItem(originalUserSessionKey);
      if (!stored) throw new Error("Original session not found. Please sign in again.");

      const { idToken } = JSON.parse(stored) as { idToken: string };

      // Exchange the stored original token for a fresh custom token
      const res = await fetch("/api/auth/restore-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Sign in as the superuser with the restored custom token
      const credential = await signInWithCustomToken(auth, data.customToken);

      // Get a fresh ID token from the credential and update the server session cookie
      const newIdToken = await credential.user.getIdToken();
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: newIdToken }),
      });
      if (!sessionRes.ok) throw new Error("Failed to restore server session.");

      sessionStorage.removeItem(impersonationSessionKey);
      sessionStorage.removeItem(originalUserSessionKey);

      toast.success("Returned to Super User account.", { id: returnToast });
      window.location.href = "/dashboard/superuser";
    } catch (error: any) {
      console.error("Failed to return to super user:", error);
      toast.error(`Failed to restore session: ${error.message}`, { id: returnToast });
      setIsReturning(false);
    }
  };

  if (!impersonatedUser) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-center gap-4 text-sm font-semibold shadow-lg">
      <AlertTriangle className="h-5 w-5" />
      <span>
        You are impersonating <strong>{impersonatedUser}</strong>.
      </span>
      <Button
        onClick={handleReturnToSuperUser}
        disabled={isReturning}
        variant="ghost"
        size="sm"
        className="text-yellow-900 hover:bg-yellow-500/50 hover:text-yellow-900 disabled:opacity-60"
      >
        {isReturning ? "Returning..." : "Return to Super User Account"}
      </Button>
    </div>
  );
}
