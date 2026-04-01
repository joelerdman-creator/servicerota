"use client";

import { useState, useEffect } from "react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, AlertTriangle, Zap, ArrowUpRight, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { PLANS, PlanId } from "@/lib/plans";
import { getEffectivePlan, getSmsMonthlyLimit } from "@/lib/subscription";
import { cn } from "@/lib/utils";

interface ChurchDoc {
  planId?: PlanId;
  subscriptionStatus?: string;
  currentPeriodEnd?: number;
  stripeCustomerId?: string;
  smsMonthlyLimit?: number;
}

interface UserProfile {
  churchId?: string;
}

const PLAN_DISPLAY = [
  {
    id: "pro" as PlanId,
    name: "Parish Standard",
    monthly: 25,
    annual: 240,
    volunteers: "Up to 150 volunteers",
    sms: "500 SMS/month",
    highlights: ["Auto-assign scheduling", "Email + SMS reminders", "Calendar subscription feeds", "Availability tracking"],
  },
  {
    id: "growth" as PlanId,
    name: "Parish Pro",
    monthly: 50,
    annual: 480,
    volunteers: "Up to 500 volunteers",
    sms: "1,500 SMS/month",
    highlights: ["Everything in Standard", "Larger volunteer roster", "Higher SMS allowance"],
  },
  {
    id: "multi_site" as PlanId,
    name: "Multi-Site",
    monthly: 125,
    annual: 1200,
    volunteers: "Unlimited volunteers",
    sms: "Unlimited SMS",
    highlights: ["Everything in Pro", "Multiple campuses/locations", "Priority support"],
  },
];

export default function BillingPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated! Welcome aboard.");
    }
    if (searchParams.get("canceled") === "true") {
      toast("Checkout canceled — no changes were made.", { icon: "ℹ️" });
    }
  }, [searchParams]);

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const churchDocRef = useMemoFirebase(
    () => (userProfile?.churchId && firestore ? doc(firestore, "churches", userProfile.churchId) : null),
    [userProfile?.churchId, firestore],
  );
  const { data: church, isLoading: isChurchLoading } = useDoc<ChurchDoc>(churchDocRef);

  const isLoading = isUserLoading || isProfileLoading || isChurchLoading;
  const effectivePlan = church ? getEffectivePlan(church) : "free";
  const smsLimit = church ? getSmsMonthlyLimit(church) : 0;
  const isActive = church?.subscriptionStatus === "active" || church?.subscriptionStatus === "trialing";
  const isPastDue = church?.subscriptionStatus === "past_due";

  const handleUpgrade = async (planId: PlanId) => {
    if (!user) { toast.error("Session expired — please refresh."); return; }
    setCheckoutLoading(`${planId}-${interval}`);
    try {
      const token = await user.getIdToken(true);
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error || "Could not start checkout.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    if (!user) { toast.error("Session expired — please refresh."); return; }
    setIsLoadingPortal(true);
    try {
      const token = await user.getIdToken(true);
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error || "Could not open billing portal.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <PageHeader
        title="Billing & Plan"
        description="Manage your Parish Scribe subscription."
        backHref="/dashboard/admin"
        backLabel="Dashboard"
      />

      {/* Current plan status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            {isPastDue && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> Payment Past Due
              </Badge>
            )}
            {isActive && (
              <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3" /> Active
              </Badge>
            )}
            {!isActive && !isPastDue && (
              <Badge variant="outline">Free</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{PLANS[effectivePlan].name}</span>
          </div>
          {isPastDue && (
            <p className="text-sm text-destructive">
              Your last payment failed. Please update your payment method to restore full access.
            </p>
          )}
          {church?.currentPeriodEnd && isActive && (
            <p className="text-sm text-muted-foreground">
              Renews {new Date(church.currentPeriodEnd * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>
              {smsLimit === -1 ? "Unlimited SMS/month" : smsLimit === 0 ? "No SMS (email only)" : `${smsLimit.toLocaleString()} SMS/month included`}
            </span>
          </div>
        </CardContent>
        {church?.stripeCustomerId && (
          <CardFooter>
            <Button variant="outline" onClick={handleManageBilling} disabled={isLoadingPortal}>
              {isLoadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUpRight className="mr-2 h-4 w-4" />}
              Manage Billing &amp; Invoices
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Upgrade options */}
      {effectivePlan === "free" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upgrade Your Plan</h2>
            <div className="flex items-center gap-1 border rounded-lg p-1 text-sm">
              <button
                className={cn("px-3 py-1 rounded-md transition-colors", interval === "monthly" ? "bg-background shadow-sm font-medium" : "text-muted-foreground")}
                onClick={() => setInterval("monthly")}
              >
                Monthly
              </button>
              <button
                className={cn("px-3 py-1 rounded-md transition-colors", interval === "annual" ? "bg-background shadow-sm font-medium" : "text-muted-foreground")}
                onClick={() => setInterval("annual")}
              >
                Annual <span className="text-green-600 font-medium">2 mo free</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLAN_DISPLAY.map((plan) => (
              <Card key={plan.id} className={cn("relative", plan.id === "pro" && "border-brand-accent/50 shadow-md")}>
                {plan.id === "pro" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-brand-accent text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      ${interval === "monthly" ? plan.monthly : Math.round(plan.annual / 12)}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  {interval === "annual" && (
                    <p className="text-xs text-green-600">${plan.annual}/year — 2 months free</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm font-medium">{plan.volunteers}</p>
                  <p className="text-sm text-muted-foreground">{plan.sms}</p>
                  <Separator />
                  <ul className="space-y-1.5">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.id === "pro" ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!checkoutLoading}
                  >
                    {checkoutLoading === `${plan.id}-${interval}` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    Get {plan.name}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Have a promo code? Enter it at checkout. Prices in USD. Cancel anytime.
          </p>
        </>
      )}
    </div>
  );
}
