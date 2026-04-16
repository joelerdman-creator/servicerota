import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Parish Scribe volunteer scheduling software.",
};

const LAST_UPDATED = "April 16, 2025";
const CONTACT_EMAIL = "admin@parishscribe.com";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b py-4 px-6">
        <Link href="/" className="w-fit">
          <Image src="/logo.png" alt="Parish Scribe" width={140} height={36} className="h-8 w-auto object-contain" />
        </Link>
      </header>

      <main className="flex-1 px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Parish Scribe,
            operated by Joel Erdman dba ParishScribe (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
            By accessing or using our platform, you agree to these Terms.
          </p>

          <Section title="1. Description of Service">
            <p>
              Parish Scribe is a volunteer scheduling platform for churches and religious organizations.
              It enables church administrators to create events, assign volunteers to roles, and send
              notifications, and enables volunteers to view their schedules, manage availability, and
              communicate with their coordinators.
            </p>
          </Section>

          <Section title="2. Eligibility and Accounts">
            <ul>
              <li>You must be at least 13 years old to use Parish Scribe.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>Church administrator accounts are subject to subscription fees as described on our pricing page.</li>
              <li>Volunteer accounts are free and are associated with a specific church on the platform.</li>
            </ul>
          </Section>

          <Section title="3. Church Administrator Responsibilities">
            <p>
              Church administrators who create and manage church accounts on Parish Scribe are responsible for:
            </p>
            <ul>
              <li>Ensuring that volunteer information added to the platform is accurate and obtained with appropriate consent.</li>
              <li>Using the platform in compliance with applicable laws, including privacy and communications laws.</li>
              <li>Managing subscriptions and keeping billing information current.</li>
              <li>Not using the platform to send unsolicited communications or for purposes outside of legitimate volunteer coordination.</li>
            </ul>
          </Section>

          <Section title="4. Volunteer Accounts">
            <p>
              Volunteers who access Parish Scribe through a church invitation or registration form agree to:
            </p>
            <ul>
              <li>Provide accurate profile information.</li>
              <li>Only opt in to SMS notifications if they own or are authorized to use the phone number provided.</li>
              <li>Use the platform for legitimate volunteer coordination purposes only.</li>
            </ul>
          </Section>

          <Section title="5. SMS Notifications">
            <p>
              Volunteers who opt in to SMS notifications will receive automated text messages about their
              assignments, service reminders, substitution requests, and schedule changes. By opting in, you
              acknowledge that:
            </p>
            <ul>
              <li>Message and data rates may apply.</li>
              <li>Message frequency varies (typically 2–8 messages per month).</li>
              <li>You may opt out at any time by replying <strong>STOP</strong> to any message.</li>
              <li>Consent to SMS is not a condition of volunteering or using Parish Scribe.</li>
            </ul>
          </Section>

          <Section title="6. Billing and Subscriptions">
            <p>
              Paid subscriptions for church administrator accounts are billed through Stripe. By subscribing,
              you authorize us to charge the applicable fees to your payment method on a recurring basis.
              Subscriptions may be cancelled at any time; cancellation takes effect at the end of the current
              billing period. Refunds are not provided for partial billing periods except where required by law.
            </p>
          </Section>

          <Section title="7. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the platform to harass, spam, or send unsolicited communications.</li>
              <li>Attempt to access accounts or data that are not yours.</li>
              <li>Interfere with the operation of the service or its infrastructure.</li>
              <li>Use the platform for any unlawful purpose.</li>
            </ul>
          </Section>

          <Section title="8. Intellectual Property">
            <p>
              The Parish Scribe platform, including its design, code, and content, is owned by
              Joel Erdman dba ParishScribe and is protected by applicable intellectual property laws.
              You may not copy, modify, or distribute any part of the platform without our written permission.
            </p>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p>
              Parish Scribe is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied.
              We do not guarantee that the service will be uninterrupted, error-free, or suitable for any
              particular purpose.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Joel Erdman dba ParishScribe shall not be liable for
              any indirect, incidental, special, or consequential damages arising from your use of the service,
              including but not limited to missed volunteer assignments or failed SMS deliveries.
            </p>
          </Section>

          <Section title="11. Changes to These Terms">
            <p>
              We may update these Terms from time to time. Continued use of the platform after changes
              are posted constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              For questions about these Terms, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2 hover:text-foreground">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t py-6 px-6">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Joel Erdman dba ParishScribe. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-foreground transition-colors">parishscribe.com</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-foreground [&_strong]:font-medium">
        {children}
      </div>
    </section>
  );
}
