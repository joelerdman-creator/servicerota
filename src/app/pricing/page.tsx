"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, X, Feather, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    id: "free",
    name: "Parish Starter",
    price: { monthly: 0, annual: 0 },
    description: "For small parishes just getting started.",
    volunteers: "Up to 20 volunteers",
    sms: "Email only",
    cta: "Get Started Free",
    ctaHref: "/claim-account",
    highlight: false,
    features: [
      { label: "Manual scheduling", included: true },
      { label: "Email notifications", included: true },
      { label: "Volunteer self-signup", included: true },
      { label: "Auto-assign scheduling", included: false },
      { label: "SMS notifications", included: false },
      { label: "Calendar subscription feeds", included: false },
      { label: "Availability reminders", included: false },
      { label: "Pre-event reminders", included: false },
      { label: "Family grouping", included: false },
    ],
  },
  {
    id: "pro",
    name: "Parish Standard",
    price: { monthly: 25, annual: 240 },
    description: "Everything a single-campus parish needs.",
    volunteers: "Up to 150 volunteers",
    sms: "500 SMS/month included",
    cta: "Start with Standard",
    ctaHref: "/dashboard/admin/billing",
    highlight: true,
    badge: "Most Popular",
    features: [
      { label: "Manual scheduling", included: true },
      { label: "Email notifications", included: true },
      { label: "Volunteer self-signup", included: true },
      { label: "Auto-assign scheduling", included: true },
      { label: "SMS notifications", included: true },
      { label: "Calendar subscription feeds", included: true },
      { label: "Availability reminders", included: true },
      { label: "Pre-event reminders", included: true },
      { label: "Family grouping", included: true },
    ],
  },
  {
    id: "growth",
    name: "Parish Pro",
    price: { monthly: 50, annual: 480 },
    description: "For growing parishes with larger rosters.",
    volunteers: "Up to 500 volunteers",
    sms: "1,500 SMS/month included",
    cta: "Start with Pro",
    ctaHref: "/dashboard/admin/billing",
    highlight: false,
    features: [
      { label: "Everything in Standard", included: true },
      { label: "Up to 500 volunteers", included: true },
      { label: "1,500 SMS/month", included: true },
      { label: "Priority email support", included: true },
      { label: "Multiple campuses", included: false },
    ],
  },
  {
    id: "multi_site",
    name: "Multi-Site",
    price: { monthly: 125, annual: 1200 },
    description: "For diocese-level or multi-campus organizations.",
    volunteers: "Unlimited volunteers",
    sms: "Unlimited SMS",
    cta: "Start Multi-Site",
    ctaHref: "/dashboard/admin/billing",
    highlight: false,
    features: [
      { label: "Everything in Pro", included: true },
      { label: "Unlimited volunteers", included: true },
      { label: "Unlimited SMS", included: true },
      { label: "Multiple campuses/locations", included: true },
      { label: "Priority support", included: true },
    ],
  },
];

export default function PricingPage() {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Feather className="h-6 w-6 text-brand-accent" />
            Parish Scribe
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link href="/sign-in">Sign in</Link></Button>
            <Button asChild><Link href="/claim-account">Get started</Link></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Headline */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple pricing for every parish
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            No setup fees. No contracts. Cancel anytime. Start free and upgrade when you&apos;re ready.
          </p>

          {/* Interval toggle */}
          <div className="inline-flex items-center gap-1 border rounded-lg p-1 text-sm mt-4">
            <button
              className={cn("px-4 py-1.5 rounded-md transition-colors font-medium", interval === "monthly" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setInterval("monthly")}
            >
              Monthly
            </button>
            <button
              className={cn("px-4 py-1.5 rounded-md transition-colors font-medium flex items-center gap-2", interval === "annual" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setInterval("annual")}
            >
              Annual
              <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full", interval === "annual" ? "bg-green-500 text-white" : "bg-green-100 text-green-700")}>
                2 months free
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={cn(
                "relative flex flex-col rounded-xl border bg-card p-6",
                tier.highlight && "border-brand-accent shadow-lg shadow-brand-accent/10 scale-[1.02]"
              )}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-brand-accent text-white px-3">{tier.badge}</Badge>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-bold">{tier.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ${interval === "monthly"
                      ? tier.price.monthly
                      : tier.price.annual === 0 ? 0 : Math.round(tier.price.annual / 12)}
                  </span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                {interval === "annual" && tier.price.annual > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    Billed ${tier.price.annual}/year
                  </p>
                )}

                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>{tier.volunteers}</p>
                  <p>{tier.sms}</p>
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {tier.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2 text-sm">
                    {f.included
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      : <X className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                    }
                    <span className={cn(!f.included && "text-muted-foreground/60")}>{f.label}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={tier.highlight ? "default" : "outline"}
                asChild
              >
                <Link href={tier.ctaHref}>
                  {tier.id !== "free" && <Zap className="mr-2 h-4 w-4" />}
                  {tier.cta}
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Promo code note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Have a promo code? Enter it at checkout. All prices in USD.
        </p>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-center">Common questions</h2>
          {[
            { q: "Can I switch plans later?", a: "Yes — upgrade or downgrade any time from your billing page. Changes take effect immediately and are prorated." },
            { q: "What counts as a volunteer?", a: "Any active user account associated with your church. Archived or deactivated accounts don't count toward your limit." },
            { q: "What happens if I hit the SMS limit?", a: "We'll notify you at 80% usage. If you go over, additional SMS are billed at $0.02 each. You can also upgrade your plan to get a higher allowance." },
            { q: "Is there a contract or cancellation fee?", a: "No contracts, no cancellation fees. Cancel any time from your billing page and you'll retain access until the end of your billing period." },
            { q: "Do you offer discounts for nonprofits?", a: "Yes — contact us. Most parishes qualify for a nonprofit discount on annual plans." },
          ].map(({ q, a }) => (
            <div key={q} className="border-b pb-6">
              <h3 className="font-semibold mb-2">{q}</h3>
              <p className="text-muted-foreground text-sm">{a}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t mt-20 py-8 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Feather className="h-4 w-4 text-brand-accent" />
          <span className="font-semibold text-foreground">Parish Scribe</span>
        </div>
        <p>© {new Date().getFullYear()} Parish Scribe. Built for faith communities.</p>
      </footer>
    </div>
  );
}
