"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/firebase";
import { signInWithCustomToken } from "firebase/auth";
import toast from "react-hot-toast";

export function ImpersonationBanner() {
  const auth = useAuth();
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    const name = sessionStorage.getItem("impersonation_active");
    setImpersonatedName(name);
  }, []);

  if (!impersonatedName) return null;

  const handleEndImpersonation = async () => {
    if (!auth) return;
    setIsEnding(true);
    try {
      const stored = sessionStorage.getItem("original_user_session");
      if (!stored) throw new Error("Original session not found.");

      const { idToken } = JSON.parse(stored) as { idToken: string };
      const customToken = await fetch("/api/auth/restore-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }).then((r) => r.json());

      if (customToken.error) throw new Error(customToken.error);

      await signInWithCustomToken(auth, customToken.customToken);
      const newIdToken = await auth.currentUser?.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: newIdToken }),
      });

      sessionStorage.removeItem("impersonation_active");
      sessionStorage.removeItem("original_user_session");
      window.location.href = "/dashboard/superuser/users";
    } catch (error: any) {
      toast.error(`Failed to end impersonation: ${error.message}`);
      setIsEnding(false);
    }
  };

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between text-sm font-medium">
      <span>
        You are impersonating <strong>{impersonatedName}</strong>. Actions taken here affect their account.
      </span>
      <button
        onClick={handleEndImpersonation}
        disabled={isEnding}
        className="ml-4 underline underline-offset-2 hover:no-underline disabled:opacity-60"
      >
        {isEnding ? "Ending..." : "End impersonation"}
      </button>
    </div>
  );
}
