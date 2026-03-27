"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { Button } from "./ui/button";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

const impersonationSessionKey = "impersonation_active";
const originalUserSessionKey = "original_user_session";

export function ImpersonationBanner() {
  const [impersonatedUser, setImpersonatedUser] = useState<string | null>(null);
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
    const returnToast = toast.loading("Returning to Super User account...");

    try {
      // Clear all session storage related to impersonation
      sessionStorage.removeItem(impersonationSessionKey);
      sessionStorage.removeItem(originalUserSessionKey);

      // Sign out the current (impersonated) user from the client
      await signOut(auth);

      // This will trigger a re-authentication flow in the FirebaseProvider,
      // which will then call our /api/auth/session to clear the server cookie.
      // After that, we redirect. The Super User's session is still valid on the server,
      // so they will be automatically logged back in.
      toast.success("Returned to Super User account. Redirecting...", { id: returnToast });
      window.location.href = "/dashboard/superuser";
    } catch (error: any) {
      console.error("Failed to return to super user:", error);
      toast.error(`Error: ${error.message}`, { id: returnToast });
      // As a fallback, clear everything and go to login
      sessionStorage.clear();
      window.location.href = "/";
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
        variant="ghost"
        size="sm"
        className="text-yellow-900 hover:bg-yellow-500/50 hover:text-yellow-900"
      >
        Return to Super User Account
      </Button>
    </div>
  );
}
