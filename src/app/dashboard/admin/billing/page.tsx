"use client";

import { useState, useEffect } from "react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, AlertTriangle, Zap, ArrowUpRight, MessageSquare, ArrowUp, ArrowDown, XCircle, CreditCard } from "lucide-react";
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

const PLAN_ORDER: PlanId[] = ["free", "pro", "growth", "multi_site"];

export default function BillingPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [changePlanLoading, setChangePlanLoading] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
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
  const isCancelingPeriodEnd = church?.subscriptionStatus === "canceling";
  const isPastDue = church?.subscriptionStatus === "past_due";
  const hasSubscription = isActive || isCancelingPeriodEnd || isPastDue;

  const currentPlanIndex = PLAN_ORDER.indexOf(effectivePlan);

  const authHeader = async () => {
    if (!user) throw new Error("Not signed in");
    const token = await user.getIdToken(true);
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  const handleUpgrade = async (planId: PlanId) => {
    if (!user) { toast.error("Session expired — please refresh."); return; }
    setCheckoutLoading(`${planId}-${interval}`);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: await authHeader(),
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.detail || data.error || "Could not start checkout.");
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleChangePlan = async (planId: PlanId) => {
    if (!user) { toast.error("Session expired — please refresh."); return; }
    setChangePlanLoading(`${planId}-${interval}`);
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: await authHeader(),
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();
      if (data.success) toast.success("Plan updated! Changes take effect immediately.");
      else toast.error(data.error || "Could not change plan.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setChangePlanLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!user) { toast.error("Session expired — please refresh."); return; }
    setIsCanceling(true);
    try {
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: await authHeader(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Subscription canceled. You'll retain access until the end of your billing period.");
        setShowCancelConfirm(false);
      } else {
        toast.error(data.error || "Could not cancel subscription.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCanceling(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user) { toast.error("Session expired — please refresh."); return; }
    setIsLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: await authHeader(),
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
            {isCancelingPeriodEnd && (
              <Badge variant="outline" className="gap-1 border-orange-400 text-orange-600">
                <XCircle className="h-3 w-3" /> Cancels at period end
              </Badge>
            )}
            {isActive && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Active
              </Badge>
            )}
            {!hasSubscription && (
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
          {isCancelingPeriodEnd && church?.currentPeriodEnd && (
            <p className="text-sm text-orange-600">
              Your subscription will end on {new Date(church.currentPeriodEnd * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. You'll retain full access until then.
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
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleManageBilling} disabled={isLoadingPortal}>
              {isLoadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Payment Method &amp; Invoices
            </Button>
            {isActive && !showCancelConfirm && (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowCancelConfirm(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Subscription
              </Button>
            )}
            {showCancelConfirm && (
              <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-sm">
                <p className="flex-1 text-destructive">Cancel at end of billing period? You won't be charged again.</p>
                <Button size="sm" variant="destructive" onClick={handleCancel} disabled={isCanceling}>
                  {isCanceling ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, cancel"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(false)}>Keep plan</Button>
              </div>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Plan options — upgrade for free, change plan for active subscribers */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {effectivePlan === "free" ? "Upgrade Your Plan" : "Change Plan"}
        </h2>
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
        {PLAN_DISPLAY.map((plan) => {
          const isCurrent = plan.id === effectivePlan;
          const planIndex = PLAN_ORDER.indexOf(plan.id);
          const isUpgrade = planIndex > currentPlanIndex;
          const isDowngrade = planIndex < currentPlanIndex;
          const loading = effectivePlan === "free"
            ? checkoutLoading === `${plan.id}-${interval}`
            : changePlanLoading === `${plan.id}-${interval}`;

          return (
            <Card key={plan.id} className={cn("relative", isCurrent && "border-brand-accent/50 shadow-md")}>
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-brand-accent text-white">Current Plan</Badge>
                </div>
              )}
              {!isCurrent && plan.id === "pro" && effectivePlan === "free" && (
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
                {isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Current Plan
                  </Button>
                ) : effectivePlan === "free" ? (
                  <Button
                    className="w-full"
                    variant={plan.id === "pro" ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!checkoutLoading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                    Get {plan.name}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={isUpgrade ? "default" : "outline"}
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={!!changePlanLoading || isCancelingPeriodEnd}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isUpgrade ? (
                      <ArrowUp className="mr-2 h-4 w-4" />
                    ) : (
                      <ArrowDown className="mr-2 h-4 w-4" />
                    )}
                    {isUpgrade ? "Upgrade" : "Downgrade"} to {plan.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
      {effectivePlan === "free" && (
        <p className="text-xs text-center text-muted-foreground">
          Have a promo code? Enter it at checkout. Prices in USD. Cancel anytime.
        </p>
      )}
      {effectivePlan !== "free" && (
        <p className="text-xs text-center text-muted-foreground">
          Plan changes take effect immediately with prorated billing. Prices in USD.
        </p>
      )}
    </div>
  );
}
