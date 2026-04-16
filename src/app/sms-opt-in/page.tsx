import Link from "next/link";
import { Feather, MessageSquare, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Public SMS opt-in information page — meets Twilio toll-free verification requirements.
 *
 * This page mirrors the consent language shown to users at the two real opt-in points:
 *   1. /join/[churchId]  — volunteer registration form (checkbox)
 *   2. /dashboard/volunteer/profile — profile page (toggle switch)
 *
 * It is publicly accessible so Twilio reviewers can verify the opt-in flow without auth.
 */
export default function SmsOptInPage() {
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

          {/* Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-primary mb-2">
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">SMS Notifications</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Text message opt-in
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Parish Scribe sends SMS reminders to keep volunteers informed about upcoming
              assignments, schedule changes, and substitution requests from their church coordinator.
            </p>
          </div>

          {/* Program details */}
          <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              Program details
            </h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2"><dt className="text-muted-foreground w-36 shrink-0">Program name</dt><dd className="text-foreground font-medium">Parish Scribe Volunteer Notifications</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-36 shrink-0">Sender</dt><dd className="text-foreground font-medium">Joel Erdman dba ParishScribe</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-36 shrink-0">Number type</dt><dd className="text-foreground font-medium">Toll-free (800-series)</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-36 shrink-0">Message types</dt><dd className="text-foreground font-medium">Assignment confirmations, service reminders, substitution requests</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-36 shrink-0">Frequency</dt><dd className="text-foreground font-medium">Varies — typically 2–8 messages/month</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-36 shrink-0">Support</dt><dd className="text-foreground font-medium"><a href="mailto:admin@parishscribe.com" className="underline underline-offset-2 hover:text-primary">admin@parishscribe.com</a></dd></div>
            </dl>
          </div>

          {/* What you'll receive */}
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">What you&apos;ll receive</h2>
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
          </div>

          {/* How to opt in — mirrors the real UI */}
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">How to opt in</h2>
            <p className="text-sm text-muted-foreground">
              SMS consent is collected at two points — both display the full disclosure below
              before the user confirms.
            </p>

            {/* Join form example */}
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Volunteer registration form</p>
              <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-gray-300 bg-white" />
                  <p className="text-sm text-gray-700 leading-snug">
                    By checking this box, I consent to receive recurring automated SMS text messages
                    from <strong>Parish Scribe (Joel Erdman dba ParishScribe)</strong> at the mobile
                    number provided, including assignment confirmations, service reminders, and
                    substitution requests. Consent is not required to volunteer.
                  </p>
                </div>
                <p className="text-xs text-gray-400 leading-snug pl-6">
                  Message and data rates may apply. Message frequency varies (typically 2–8/month).
                  Reply <strong>STOP</strong> to cancel, <strong>HELP</strong> for help.
                  See our <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link> and <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms of Service</Link>.
                </p>
              </div>
            </div>

            {/* Profile toggle example */}
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Volunteer profile settings</p>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable text message notifications</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      By enabling this, I consent to receive recurring automated SMS text messages
                      from <strong>Parish Scribe (Joel Erdman dba ParishScribe)</strong> including
                      assignment confirmations, service reminders, and substitution requests.
                    </p>
                  </div>
                  <div className="h-6 w-11 rounded-full bg-primary shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Message and data rates may apply. Message frequency varies (typically 2–8/month).
                  Reply <strong>STOP</strong> to cancel, <strong>HELP</strong> for help.
                  Consent is not required to use Parish Scribe. See our{" "}
                  <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link> and <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms of Service</Link>.
                </p>
              </div>
            </div>
          </div>

          {/* Opt-out */}
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Opting out</p>
            <p>Reply <strong>STOP</strong> to any message to cancel immediately. You can also disable SMS notifications at any time from your profile settings.</p>
            <p>Reply <strong>HELP</strong> for help, or contact <a href="mailto:admin@parishscribe.com" className="underline underline-offset-2 hover:text-foreground">admin@parishscribe.com</a>.</p>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="gap-2">
              <Link href="/signup">
                Create an account <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Learn about Parish Scribe</Link>
            </Button>
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
