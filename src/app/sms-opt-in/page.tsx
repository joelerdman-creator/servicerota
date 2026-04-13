"use client";

import { useState } from "react";
import Link from "next/link";
import { Feather, MessageSquare, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function SmsOptInPage() {
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("You must check the consent box to opt in to SMS messages.");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your mobile phone number.");
      return;
    }

    // In production this would record the opt-in with timestamp, IP, and form version.
    // For now, just show the confirmation.
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b py-4 px-6">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <Feather className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">Parish Scribe</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mx-auto">
              <CheckCircle2 className="h-8 w-8 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">You&apos;re opted in!</h1>
            <p className="text-muted-foreground">
              You&apos;ll receive SMS reminders and notifications from Parish Scribe for your
              scheduled volunteer assignments. Reply <strong>STOP</strong> at any time to cancel.
            </p>
            <Link href="/" className="inline-block text-sm text-primary underline underline-offset-4">
              Return to Parish Scribe
            </Link>
          </div>
        </main>

        <footer className="border-t py-6 px-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Joel Erdman dba ParishScribe. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b py-4 px-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <Feather className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Parish Scribe</span>
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="max-w-lg w-full space-y-8">

          {/* Title block */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-primary mb-2">
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">SMS Notifications</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Opt in to text reminders
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Parish Scribe sends SMS reminders to keep you informed about your upcoming
              volunteer assignments, schedule changes, and substitution requests from your church.
            </p>
          </div>

          {/* What you'll receive */}
          <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              What you&apos;ll receive
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Assignment confirmations when you're added to a service",
                "Upcoming service reminders (typically 1–3 days before)",
                "Substitution requests when a volunteer needs coverage",
                "Schedule change notifications from your coordinator",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground pt-1 border-t">
              Message frequency varies based on your schedule — typically 2–8 messages per month.
            </p>
          </div>

          {/* Opt-in form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
              <p className="text-xs text-muted-foreground">
                US mobile numbers only. Standard carrier messaging rates apply.
              </p>
            </div>

            {/* Consent checkbox — required by Twilio */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(v) => setConsent(!!v)}
                  className="mt-0.5"
                />
                <label htmlFor="consent" className="text-sm text-foreground leading-relaxed cursor-pointer">
                  By checking this box, I consent to receive recurring automated SMS text messages
                  from <strong>Parish Scribe (Joel Erdman dba ParishScribe)</strong> at the mobile
                  number provided above. Consent is not a condition of any purchase or service.
                </label>
              </div>

              {/* TCPA / Twilio required disclosures */}
              <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                <p>
                  Message and data rates may apply. Message frequency varies (typically 2–8 per
                  month based on your volunteer schedule).
                </p>
                <p>
                  Reply <strong>STOP</strong> to cancel at any time. Reply <strong>HELP</strong>{" "}
                  for help or contact{" "}
                  <a href="mailto:support@parishscribe.com" className="underline underline-offset-2 hover:text-foreground">
                    support@parishscribe.com
                  </a>
                  .
                </p>
                <p>
                  By opting in you agree to our{" "}
                  <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={!consent}>
              Opt In to SMS Reminders
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You can opt out at any time by replying <strong>STOP</strong> to any message you
              receive from Parish Scribe.
            </p>
          </form>

          {/* Program details — required for Twilio verification */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-sm">Program details</p>
            <p><strong>Program name:</strong> Parish Scribe Volunteer Notifications</p>
            <p><strong>Sender:</strong> Joel Erdman dba ParishScribe</p>
            <p><strong>Phone number type:</strong> Toll-free (800-series)</p>
            <p><strong>Message types:</strong> Transactional — volunteer assignment confirmations, service reminders, substitution requests</p>
            <p><strong>Customer support:</strong>{" "}
              <a href="mailto:support@parishscribe.com" className="underline underline-offset-2 hover:text-foreground">
                support@parishscribe.com
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-6">
        <div className="max-w-lg mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Joel Erdman dba ParishScribe. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-foreground transition-colors">parishscribe.com</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
