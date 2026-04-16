"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import {
  Users, Mail, Zap, CalendarDays, CheckCircle2,
  Clock, ArrowRight, BarChart3, Bell, RefreshCw, MessageSquare,
  ChevronRight, Shield,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ---------------------------------------------------------------------------
// Mini feature mockups
// ---------------------------------------------------------------------------

function ScheduleMiniMockup() {
  const rows = [
    { role: "Lector", filled: [true, true, true] },
    { role: "Usher",  filled: [true, false, true] },
    { role: "Music",  filled: [true, true, false] },
    { role: "Greeter",filled: [false, true, true] },
  ];
  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
        <span className="text-[10px] font-semibold text-muted-foreground">Auto-scheduled · 3 services</span>
      </div>
      {rows.map(({ role, filled }) => (
        <div key={role} className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground w-12 shrink-0">{role}</span>
          <div className="flex gap-1">
            {filled.map((ok, di) => (
              <div
                key={di}
                className={`h-4 w-10 rounded text-[8px] font-semibold flex items-center justify-center ${
                  ok
                    ? "bg-primary/15 text-primary"
                    : "border border-dashed border-muted-foreground/30 text-muted-foreground/40"
                }`}
              >
                {ok ? "✓" : "—"}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RosterMiniMockup() {
  const volunteers = [
    { initials: "MS", name: "M. Sullivan", role: "Lector", active: true },
    { initials: "TB", name: "T. Bergman",  role: "Usher",  active: true },
    { initials: "RO", name: "R. Okafor",   role: "Greeter",active: false },
  ];
  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground">12 volunteers</span>
        <span className="text-[9px] bg-primary/10 text-primary rounded px-1.5 py-0.5 font-semibold">4 roles</span>
      </div>
      {volunteers.map((v) => (
        <div key={v.name} className="flex items-center gap-2 px-2 py-1.5 rounded bg-card border">
          <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-[8px] font-bold text-primary">{v.initials}</span>
          </div>
          <span className="text-[10px] font-semibold text-foreground flex-1">{v.name}</span>
          <span className="text-[9px] text-muted-foreground">{v.role}</span>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${v.active ? "bg-green-500" : "bg-amber-400"}`} />
        </div>
      ))}
    </div>
  );
}

function NotificationsMiniMockup() {
  const items = [
    { to: "M. Sullivan", subject: "You're scheduled Sunday", status: "Opened",    color: "text-teal-600" },
    { to: "T. Bergman",  subject: "Reminder: 10am service",  status: "Delivered", color: "text-muted-foreground" },
    { to: "R. Okafor",   subject: "Confirm your slot",       status: "Pending",   color: "text-amber-600" },
  ];
  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
        <span className="text-[10px] font-semibold text-muted-foreground">3 reminders sent</span>
      </div>
      {items.map((n) => (
        <div key={n.to} className="flex items-center gap-2 px-2 py-1.5 rounded bg-card border">
          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-semibold text-foreground truncate">{n.to}</p>
            <p className="text-[8px] text-muted-foreground truncate">{n.subject}</p>
          </div>
          <span className={`text-[8px] font-semibold shrink-0 ${n.color}`}>{n.status}</span>
        </div>
      ))}
    </div>
  );
}

function CalendarMiniMockup() {
  const highlighted = new Set([6, 13, 20, 27]);
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground">Personal feed · June</span>
        <div className="flex gap-1">
          {["G", "O", "A"].map((l) => (
            <span key={l} className="h-4 w-4 rounded text-[8px] font-bold bg-card border flex items-center justify-center text-muted-foreground">
              {l}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-[8px] text-center text-muted-foreground font-semibold">{d}</div>
        ))}
        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
          <div
            key={day}
            className={`h-4 rounded text-[8px] flex items-center justify-center font-medium ${
              highlighted.has(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
        <span className="text-[9px] text-muted-foreground">Auto-syncs with your calendar app</span>
      </div>
    </div>
  );
}

function SubRequestMiniMockup() {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        <RefreshCw className="h-3 w-3 text-amber-500" />
        <span className="text-[10px] font-semibold text-muted-foreground">Sub request · open</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 px-2 py-1.5 rounded border bg-card text-center">
          <p className="text-[9px] font-bold text-foreground">M. Sullivan</p>
          <p className="text-[8px] text-muted-foreground">Lector · Jun 15</p>
        </div>
        <RefreshCw className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <div className="flex-1 px-2 py-1.5 rounded border border-dashed bg-amber-50 dark:bg-amber-900/20 text-center">
          <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400">Open slot</p>
          <p className="text-[8px] text-amber-600/70">2 available</p>
        </div>
      </div>
      <div className="flex gap-1 pt-0.5">
        <div className="flex-1 text-center py-1 rounded bg-primary/10 text-[9px] font-semibold text-primary">Claim slot</div>
        <div className="flex-1 text-center py-1 rounded bg-muted border text-[9px] font-semibold text-muted-foreground">Decline</div>
      </div>
    </div>
  );
}

function AvailabilityMiniMockup() {
  const volunteers = ["M.S.", "T.B.", "R.O.", "S.C."];
  const grid = [
    [true,  true,  false, true ],
    [true,  false, true,  true ],
    [false, true,  true,  true ],
    [true,  true,  true,  false],
  ];
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground">June availability</span>
        <span className="text-[9px] bg-teal-100 text-teal-700 rounded px-1.5 py-0.5 font-semibold">4 reported</span>
      </div>
      <div className="grid grid-cols-5 gap-0.5">
        <div />
        {["Wk 1", "Wk 2", "Wk 3", "Wk 4"].map((w) => (
          <div key={w} className="text-[8px] text-center text-muted-foreground font-semibold">{w}</div>
        ))}
        {volunteers.map((v, vi) => (
          <React.Fragment key={vi}>
            <div className="text-[9px] text-muted-foreground font-medium flex items-center">{v}</div>
            {grid[vi].map((avail, wi) => (
              <div
                key={wi}
                className={`h-4 rounded text-[8px] flex items-center justify-center font-semibold ${
                  avail ? "bg-teal-100 text-teal-700" : "bg-red-100/60 text-red-400"
                }`}
              >
                {avail ? "✓" : "✗"}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Features data
// ---------------------------------------------------------------------------

const features = [
  {
    icon: Zap,
    title: "AI Auto-Scheduling",
    description:
      "Generate fair, balanced volunteer schedules in seconds. The algorithm respects availability, serving frequency, and role preferences automatically.",
    mockup: <ScheduleMiniMockup />,
  },
  {
    icon: Users,
    title: "Volunteer Management",
    description:
      "One hub for your entire roster. Track assignments, manage family groups, and let volunteers self-manage their availability and preferences.",
    mockup: <RosterMiniMockup />,
  },
  {
    icon: Mail,
    title: "Automated Notifications",
    description:
      "Email and SMS reminders go out automatically for new assignments, upcoming services, and substitution requests — no manual follow-up needed.",
    mockup: <NotificationsMiniMockup />,
  },
  {
    icon: CalendarDays,
    title: "Calendar Feeds",
    description:
      "Volunteers subscribe to a personal calendar feed that shows only their assignments, syncing automatically with Google Calendar, Outlook, or Apple Calendar.",
    mockup: <CalendarMiniMockup />,
  },
  {
    icon: RefreshCw,
    title: "Substitution Requests",
    description:
      "Volunteers can request a sub directly in the app. Others can claim the open slot and the schedule updates automatically.",
    mockup: <SubRequestMiniMockup />,
  },
  {
    icon: BarChart3,
    title: "Availability Tracking",
    description:
      "Collect availability windows in advance so the auto-scheduler always has accurate, up-to-date data before building each week's rota.",
    mockup: <AvailabilityMiniMockup />,
  },
];

const steps = [
  {
    number: "01",
    title: "Add your volunteers",
    description:
      "Import your roster or invite volunteers directly. They set their own availability and preferences.",
  },
  {
    number: "02",
    title: "Build your service schedule",
    description:
      "Create service templates with the roles you need filled. One click generates a full schedule.",
  },
  {
    number: "03",
    title: "Notify automatically",
    description:
      "Email and SMS confirmations go out instantly. Volunteers can accept, swap, or request substitutions from the link.",
  },
];

const testimonials = [
  {
    quote:
      "We used to spend hours on the phone every week sorting the rota. Parish Scribe cut that down to about 10 minutes.",
    name: "Music Director",
    church: "Catholic Parish, Midwest",
  },
  {
    quote:
      "The auto-scheduler is remarkable. It knows who's served recently and keeps things fair without us having to track it manually.",
    name: "Volunteer Coordinator",
    church: "Anglican Church, Southeast",
  },
  {
    quote:
      "Our volunteers love getting a calendar link they can subscribe to. No more 'I didn't know I was scheduled' excuses.",
    name: "Parish Administrator",
    church: "Episcopal Church, Northeast",
  },
];

// ---------------------------------------------------------------------------
// Hero product mockup
// ---------------------------------------------------------------------------

function AppMockup({ compact = false }: { compact?: boolean }) {
  const roles = [
    { role: "Lector",    name: "M. Sullivan", confirmed: true  },
    { role: "Usher",     name: "T. Bergman",  confirmed: true  },
    { role: "Greeter",   name: "R. Okafor",   confirmed: false },
    { role: "Music Lead",name: "S. Chen",     confirmed: true  },
    { role: "Communion", name: "P. Holt",     confirmed: true  },
  ];

  return (
    <div className={`relative w-full select-none ${compact ? "max-w-lg" : "max-w-2xl mx-auto mt-16 mb-4"}`}>
      {/* Glow backdrop */}
      <div className="absolute -inset-4 bg-gradient-to-b from-primary/10 via-brand-accent/5 to-transparent rounded-3xl blur-2xl pointer-events-none" />

      {/* Browser chrome */}
      <div className="relative rounded-xl border bg-card shadow-2xl overflow-hidden">
        {/* Fake browser bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          </div>
          <div className="flex-1 mx-3 h-5 rounded bg-background/70 flex items-center px-2">
            <span className="text-[10px] text-muted-foreground/60 font-mono">
              parishscribe.com/dashboard
            </span>
          </div>
        </div>

        {/* Fake nav */}
        <div className="flex items-center gap-4 px-5 py-3 border-b bg-primary">
          <Image src="/icon.png" alt="Parish Scribe" width={16} height={16} className="h-4 w-4 object-contain shrink-0 rounded-sm" />
          <span className="text-xs font-semibold text-white">Parish Scribe</span>
          <div className="flex gap-3 ml-2">
            {["Schedule", "Volunteers", "Events"].map((item, i) => (
              <span
                key={item}
                className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                  i === 0 ? "bg-white/20 text-white" : "text-white/60"
                }`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 bg-background">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                Sunday Service
              </p>
              <h3 className="text-base font-bold text-primary leading-tight">
                10:00 AM — Holy Eucharist
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                June 15 · All volunteers confirmed
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <span className="inline-flex items-center rounded-full bg-teal-100 text-teal-800 text-[10px] font-semibold px-2 py-0.5">
                Published
              </span>
              <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-semibold px-2 py-0.5">
                5 / 5 filled
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            {roles.map(({ role, name, confirmed }) => (
              <div
                key={role}
                className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-primary">
                      {name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-none">{name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{role}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full text-[10px] font-semibold px-2 py-0.5 ${
                    confirmed
                      ? "bg-teal-100 text-teal-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {confirmed ? "Confirmed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating notification card */}
      <div className="absolute -right-4 -bottom-5 sm:-right-8 sm:bottom-6 w-52 rounded-xl border bg-card shadow-xl p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-brand-accent shrink-0" />
          <span className="text-[11px] font-semibold text-foreground">Reminder sent</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          5 volunteers notified for Sunday's service. 4 confirmed so far.
        </p>
        <p className="text-[10px] text-muted-foreground/60">Just now</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomeClient() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Parish Scribe" width={160} height={40} className="h-9 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ---------------------------------------------------------------- */}
        {/* Hero — two-column on lg+, stacked on mobile                       */}
        {/* ---------------------------------------------------------------- */}
        <section className="pt-20 pb-10 md:pt-28 md:pb-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent pointer-events-none" />
          <div className="container px-4 md:px-6 relative">

            {/* Two-column on lg+ */}
            <div className="grid lg:grid-cols-2 lg:gap-12 xl:gap-20 items-center">

              {/* Left column: text + CTAs */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground mb-6">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Free plan available — no credit card required
                </div>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                  Church volunteer scheduling,{" "}
                  <span className="text-brand-accent italic">finally automated</span>
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Parish Scribe replaces your spreadsheets and phone calls with AI-powered scheduling,
                  automated reminders, and a self-service portal your volunteers will actually use.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center">
                  <Button size="lg" asChild className="gap-2 px-8">
                    <Link href="/signup">
                      Start for free <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/pricing">View pricing</Link>
                  </Button>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Free plan includes up to 20 volunteers. No credit card needed.
                </p>
              </div>

              {/* Right column: product mockup (desktop only) */}
              <div className="hidden lg:flex justify-center items-center pr-12 pb-8">
                <AppMockup compact />
              </div>
            </div>

            {/* Mobile: product mockup below CTAs */}
            <div className="lg:hidden">
              <AppMockup />
            </div>
          </div>
        </section>

        {/* Social proof bar */}
        <section className="border-y bg-muted/30 py-6 mt-4 lg:mt-0">
          <div className="container px-4 md:px-6">
            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              {[
                "Works with any denomination",
                "Set up in under 30 minutes",
                "Volunteers need no training",
                "Cancel anytime",
              ].map((text) => (
                <div key={text} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 md:py-32 marketing-section">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Everything your coordinator needs
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Built specifically for liturgical and faith communities. Every feature is designed
                around how churches actually schedule volunteers.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border bg-card p-6 space-y-4 hover:shadow-md transition-shadow"
                >
                  {/* Mini UI mockup */}
                  {feature.mockup}

                  <div className="flex items-center gap-3 pt-1">
                    <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2 shrink-0">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base text-foreground">{feature.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-24 md:py-32 bg-muted/30 marketing-section">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Up and running in minutes
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                No IT department required. Most coordinators are scheduling their first service
                the same day they sign up.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
              {steps.map((step) => (
                <div key={step.number} className="relative text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg font-display">
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-base text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 md:py-32 marketing-section">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Trusted by coordinators across the country
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="rounded-xl border bg-card p-6 space-y-4">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-amber-400 text-sm">★</span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic font-display">
                    "{t.quote}"
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.church}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="py-24 md:py-32 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4 text-primary-foreground">
              Start free, grow as you need
            </h2>
            <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-10">
              The free plan covers up to 20 volunteers with unlimited events. Upgrade any time for
              SMS reminders, auto-scheduling, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                asChild
                className="gap-2 px-8 bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
              >
                <Link href="/signup">
                  Get started free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                asChild
                className="gap-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
              >
                <Link href="/pricing">
                  See all plans <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-primary-foreground/60">
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 5-minute setup</span>
              <span className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Cancel anytime</span>
              <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Email support included</span>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-10 border-t">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Parish Scribe" width={120} height={30} className="h-7 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
              <Link href="/sms-opt-in" className="hover:text-foreground transition-colors">SMS Opt-In</Link>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Joel Erdman dba ParishScribe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
