"use client";

import { Button } from "@/components/ui/button";
import AppRouter from "@/components/AppRouter";
import { useUser } from "@/firebase";
import {
  Users, Mail, Zap, Feather, CalendarDays, CheckCircle2,
  Clock, ArrowRight, BarChart3, Bell, RefreshCw, MessageSquare,
  ChevronRight, Shield
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Zap,
    title: "AI Auto-Scheduling",
    description: "Generate fair, balanced volunteer schedules in seconds. The algorithm respects availability, serving frequency, and role preferences automatically.",
  },
  {
    icon: Users,
    title: "Volunteer Management",
    description: "One hub for your entire roster. Track assignments, manage family groups, and let volunteers self-manage their availability and preferences.",
  },
  {
    icon: Mail,
    title: "Automated Notifications",
    description: "Email and SMS reminders go out automatically for new assignments, upcoming services, and substitution requests — no manual follow-up needed.",
  },
  {
    icon: CalendarDays,
    title: "Calendar Feeds",
    description: "Volunteers subscribe to a personal calendar feed that shows only their assignments, syncing automatically with Google Calendar, Outlook, or Apple Calendar.",
  },
  {
    icon: RefreshCw,
    title: "Substitution Requests",
    description: "Volunteers can request a sub directly in the app. Others can claim the open slot and the schedule updates automatically.",
  },
  {
    icon: BarChart3,
    title: "Availability Tracking",
    description: "Collect availability windows in advance so the auto-scheduler always has accurate, up-to-date data before building each week's rota.",
  },
];

const steps = [
  {
    number: "01",
    title: "Add your volunteers",
    description: "Import your roster or invite volunteers directly. They set their own availability and preferences.",
  },
  {
    number: "02",
    title: "Build your service schedule",
    description: "Create service templates with the roles you need filled. One click generates a full schedule.",
  },
  {
    number: "03",
    title: "Notify automatically",
    description: "Email and SMS confirmations go out instantly. Volunteers can accept, swap, or request substitutions from the link.",
  },
];

const testimonials = [
  {
    quote: "We used to spend hours on the phone every week sorting the rota. Parish Scribe cut that down to about 10 minutes.",
    name: "Music Director",
    church: "Catholic Parish, Midwest",
  },
  {
    quote: "The auto-scheduler is remarkable. It knows who's served recently and keeps things fair without us having to track it manually.",
    name: "Volunteer Coordinator",
    church: "Anglican Church, Southeast",
  },
  {
    quote: "Our volunteers love getting a calendar link they can subscribe to. No more 'I didn't know I was scheduled' excuses.",
    name: "Parish Administrator",
    church: "Episcopal Church, Northeast",
  },
];

export default function HomeClient() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin h-10 w-10 border-4 border-primary rounded-full border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <AppRouter />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Feather className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Parish Scribe</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
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

        {/* Hero */}
        <section className="py-20 md:py-32 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <div className="container px-4 md:px-6 relative">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Free plan available — no credit card required
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-6 max-w-4xl mx-auto leading-tight">
              Church volunteer scheduling,{" "}
              <span className="text-primary">finally automated</span>
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground text-lg md:text-xl mb-10 leading-relaxed">
              Parish Scribe replaces your spreadsheets and phone calls with AI-powered scheduling, automated reminders, and a self-service portal your volunteers will actually use.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
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
        </section>

        {/* Social proof bar */}
        <section className="border-y bg-muted/30 py-6">
          <div className="container px-4 md:px-6">
            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Works with any denomination
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Set up in under 30 minutes
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Volunteers need no training
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Cancel anytime
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Everything your coordinator needs
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Built specifically for liturgical and faith communities. Every feature is designed around how churches actually schedule volunteers.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-xl border bg-card p-6 space-y-3 hover:shadow-md transition-shadow">
                  <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-24 md:py-32 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Up and running in minutes
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                No IT department required. Most coordinators are scheduling their first service the same day they sign up.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
              {steps.map((step) => (
                <div key={step.number} className="relative text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-base">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Trusted by coordinators across the country
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="rounded-xl border bg-card p-6 space-y-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-sm">★</span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
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
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Start free, grow as you need
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
              The free plan covers up to 20 volunteers with unlimited events. Upgrade any time for SMS reminders, auto-scheduling, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" variant="secondary" asChild className="gap-2 px-8">
                <Link href="/signup">
                  Get started free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link href="/pricing">
                  See all plans <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-primary-foreground/70">
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
              <Feather className="h-5 w-5 text-primary" />
              <span className="font-semibold">Parish Scribe</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Parish Scribe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
