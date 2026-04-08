
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth, useUser, useFirestore, WithId } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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
import { Loader2, ArrowLeftRight, Check, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { sendNotification } from "@/ai/flows/send-notification-flow";

// --- TYPES ---
interface TradeRequest {
  status: "pending" | "accepted" | "declined" | "expired";
  requesterId: string;
  requesterName: string;
  requesterRoleId: string;
  requesterEventId: string;
  requesterRoleName: string;
  requesterEventName: string;
  requesterEventDate: string;
  targetId: string;
  targetName: string;
  targetRoleId: string;
  targetEventId: string;
  targetRoleName: string;
  targetEventName: string;
  targetEventDate: string;
  churchId: string;
}

interface ChurchProfile {
  name?: string;
}

function ClaimTrade() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tradeId = searchParams.get("tradeId");
  const churchId = searchParams.get("churchId");

  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trade, setTrade] = useState<TradeRequest | null>(null);
  const [result, setResult] = useState<"accepted" | "declined" | null>(null);

  // Fetch trade details
  useEffect(() => {
    if (!tradeId || !churchId || !firestore) {
      setError("This trade link is invalid.");
      setIsLoading(false);
      return;
    }

    const fetchTrade = async () => {
      try {
        const tradeRef = doc(firestore, `churches/${churchId}/trade_requests/${tradeId}`);
        const tradeSnap = await getDoc(tradeRef);

        if (!tradeSnap.exists()) {
          throw new Error("This trade request no longer exists.");
        }

        const tradeData = tradeSnap.data() as TradeRequest;

        if (tradeData.status !== "pending") {
          throw new Error(
            tradeData.status === "accepted"
              ? "This trade has already been accepted."
              : tradeData.status === "declined"
                ? "This trade was declined."
                : "This trade has expired.",
          );
        }

        setTrade(tradeData);
      } catch (e: any) {
        setError(e.message || "Could not load trade details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrade();
  }, [tradeId, churchId, firestore]);

  const handleAcceptTrade = async () => {
    if (!user || !trade || !tradeId || !churchId || !firestore) return;

    // Verify the current user is the target of the trade
    if (user.uid !== trade.targetId) {
      toast.error("You are not the intended recipient of this trade.");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading("Processing trade...");

    try {
      const tradeRef = doc(firestore, `churches/${churchId}/trade_requests/${tradeId}`);

      // Re-check trade is still pending
      const freshTradeSnap = await getDoc(tradeRef);
      if (!freshTradeSnap.exists() || freshTradeSnap.data().status !== "pending") {
        throw new Error("This trade is no longer available.");
      }

      // Swap the assignments
      const requesterRoleRef = doc(
        firestore,
        `churches/${churchId}/events/${trade.requesterEventId}/roles/${trade.requesterRoleId}`,
      );
      const targetRoleRef = doc(
        firestore,
        `churches/${churchId}/events/${trade.targetEventId}/roles/${trade.targetRoleId}`,
      );

      // Requester takes Target's old role
      await updateDoc(requesterRoleRef, {
        assignedVolunteerId: trade.targetId,
        assignedVolunteerName: trade.targetName,
        status: "Confirmed",
      });

      // Target takes Requester's old role
      await updateDoc(targetRoleRef, {
        assignedVolunteerId: trade.requesterId,
        assignedVolunteerName: trade.requesterName,
        status: "Confirmed",
      });

      // Mark trade as accepted
      await updateDoc(tradeRef, { status: "accepted" });

      // Notify the requester
      const requesterSnap = await getDoc(doc(firestore, "users", trade.requesterId));
      const churchSnap = await getDoc(doc(firestore, "churches", churchId));
      const church = churchSnap.exists() ? (churchSnap.data() as ChurchProfile) : null;

      if (requesterSnap.exists()) {
        const requester = requesterSnap.data() as { email?: string | null; phone?: string; smsOptIn?: boolean };
        if (requester.email) {
          void sendNotification({
            type: "trade_accepted",
            toEmail: requester.email,
            toPhone: requester.phone,
            smsOptIn: requester.smsOptIn,
            requesterName: trade.requesterName,
            acceptedByName: trade.targetName,
            newRoleName: trade.targetRoleName,
            newEventName: trade.targetEventName,
            newEventDate: trade.targetEventDate,
            churchName: church?.name || "your church",
            loginUrl: `${window.location.origin}/dashboard`,
            churchId,
          });
        }
      }

      toast.success("Trade accepted! Assignments have been swapped.", { id: loadingToast });
      setResult("accepted");
    } catch (e: any) {
      toast.error(e.message || "Failed to process trade.", { id: loadingToast });
      setError(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineTrade = async () => {
    if (!tradeId || !churchId || !firestore) return;

    setIsProcessing(true);
    try {
      const tradeRef = doc(firestore, `churches/${churchId}/trade_requests/${tradeId}`);
      await updateDoc(tradeRef, { status: "declined" });
      toast.success("Trade declined.");
      setResult("declined");
    } catch (e: any) {
      toast.error("Failed to decline trade.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success("Signed in!");
    } catch (e: any) {
      toast.error(e.message || "Failed to sign in.");
    }
  };

  if (isLoading || isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-2">Loading trade details...</p>
      </div>
    );
  }

  if (error && !trade) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Trade Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild variant="outline">
              <a href="/dashboard/volunteer/schedule">Go to My Schedule</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">
              {result === "accepted" ? "Trade Complete!" : "Trade Declined"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {result === "accepted"
                ? "Your assignments have been swapped. Check your dashboard for the updated schedule."
                : "The trade has been declined. No changes were made."}
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <a href="/dashboard/volunteer/schedule">View My Schedule</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6" />
            Trade Request
          </CardTitle>
          <CardDescription>
            {trade?.requesterName} wants to swap assignments with you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Side-by-side swap cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* They offer */}
            <div className="rounded-lg border-2 border-teal-200 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-800 p-3 space-y-1">
              <p className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide">
                They offer you
              </p>
              <p className="font-bold text-sm leading-tight">{trade?.requesterRoleName}</p>
              <p className="text-xs text-muted-foreground leading-tight">{trade?.requesterEventName}</p>
              <p className="text-xs font-medium text-teal-700 dark:text-teal-300">
                {trade?.requesterEventDate &&
                  format(parseISO(trade.requesterEventDate), "MMM do 'at' h:mm a")}
              </p>
            </div>

            {/* You give */}
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 space-y-1">
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                In exchange for
              </p>
              <p className="font-bold text-sm leading-tight">{trade?.targetRoleName}</p>
              <p className="text-xs text-muted-foreground leading-tight">{trade?.targetEventName}</p>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {trade?.targetEventDate &&
                  format(parseISO(trade.targetEventDate), "MMM do 'at' h:mm a")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
            Both assignments will be swapped automatically upon acceptance.
          </div>

          {user ? (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:text-destructive border-destructive/30"
                onClick={handleDeclineTrade}
                disabled={isProcessing}
              >
                <X className="mr-2 h-4 w-4" />
                Decline
              </Button>
              <Button className="flex-1 gap-2" onClick={handleAcceptTrade} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Accept Trade
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">You must be signed in to respond to this trade.</p>
              <Button onClick={handleSignIn} className="w-full">
                <GoogleIcon className="mr-2 h-4 w-4" />
                Sign in with Google
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClaimTradePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">Loading...</div>
      }
    >
      <ClaimTrade />
    </Suspense>
  );
}
