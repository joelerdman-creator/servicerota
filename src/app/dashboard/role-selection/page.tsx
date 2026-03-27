
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { User, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";

export default function RoleSelectionPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = async (role: "admin" | "volunteer") => {
    setErrorMsg(null);
    if (!user || !firestore || isSubmitting) {
      if (!user || !firestore) {
        const msg = "User or database not available. Please try again.";
        toast.error(msg);
        setErrorMsg(msg);
      }
      return;
    }

    setIsSubmitting(true);
    const userDocRef = doc(firestore, "users", user.uid);
    let batchDataForError: Record<string, any> = {};
    const batch = writeBatch(firestore);

    try {
      if (role === "admin") {
        const newChurchRef = doc(collection(firestore, "churches"));
        const churchId = newChurchRef.id;

        const userUpdate = {
          churchId: churchId,
          role: "admin",
          isAdmin: true,
        };

        const churchData = {
          id: churchId,
          name: `${user.displayName || "Admin"}'s Church`,
          ownerId: user.uid,
          contactEmail: user.email || "",
          address: "",
          createdAt: serverTimestamp(),
        };

        batch.update(userDocRef, userUpdate);
        batch.set(newChurchRef, churchData);

        batchDataForError = { userUpdate, churchData, churchPath: newChurchRef.path };
      } else {
        // Volunteer role
        const userUpdate = {
          role: "volunteer",
          isAdmin: false,
          // churchId remains as is, or null if not previously set
        };
        batch.update(userDocRef, userUpdate);
        batchDataForError = { userUpdate };
      }

      await batch.commit();

      if (role === "admin") {
        toast.success("Administrator account configured!");
        router.push("/dashboard/admin");
      } else {
        toast.success("Volunteer account configured!");
        router.push("/dashboard/volunteer");
      }
    } catch (serverError: any) {
      const userFacingError = `Failed to save your role. Please check permissions and try again.`;
      setErrorMsg(userFacingError);
      toast.error(userFacingError);
      console.error("Role Selection Error:", serverError.message || serverError);

      const permissionError = new FirestorePermissionError({
        path: `Batch write failed for user: ${user.uid}`,
        operation: "write", // Represents a batch write operation
        requestResourceData: batchDataForError,
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading user...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
      <div className="text-center max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-2">One last step!</h1>
        <p className="text-lg text-muted-foreground mb-12">
          How will you be using Parish Scribe? Your selection will set up your initial account.
        </p>

        {errorMsg && (
          <div className="bg-destructive/20 border border-destructive/50 text-destructive-foreground p-4 rounded-md mb-6 text-left">
            <p className="font-bold">An error occurred:</p>
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <Button
            variant="outline"
            className="h-auto p-8 flex flex-col gap-3"
            onClick={() => handleRoleSelect("volunteer")}
            disabled={isSubmitting}
          >
            <User className="h-10 w-10 text-primary" />
            <span className="text-xl font-semibold">I'm a Volunteer</span>
            <span className="text-sm text-muted-foreground">View my schedule and roles.</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-8 flex flex-col gap-3"
            onClick={() => handleRoleSelect("admin")}
            disabled={isSubmitting}
          >
            <Shield className="h-10 w-10 text-primary" />
            <span className="text-xl font-semibold">I'm an Administrator</span>
            <span className="text-sm text-muted-foreground">Manage events and volunteers.</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-8">
          You can be both an administrator and a volunteer. You will be able to switch views later.
        </p>
      </div>
    </div>
  );
}
