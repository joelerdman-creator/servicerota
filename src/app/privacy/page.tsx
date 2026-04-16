import type { Metadata } from "next";
import Link from "next/link";
import { Feather } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Parish Scribe volunteer scheduling software.",
};

const LAST_UPDATED = "April 16, 2025";
const CONTACT_EMAIL = "admin@parishscribe.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b py-4 px-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <Feather className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Parish Scribe</span>
        </Link>
      </header>

      <main className="flex-1 px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            Parish Scribe (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is operated by Joel Erdman dba ParishScribe. This Privacy Policy
            explains how we collect, use, and protect information when you use our volunteer scheduling
            platform at parishscribe.com and related services.
          </p>

          <Section title="1. Information We Collect">
            <p>We collect the following information to provide our scheduling service:</p>
            <ul>
              <li><strong>Account information:</strong> Name, email address, and Google account profile (when signing in via Google).</li>
              <li><strong>Contact information:</strong> Phone number, if you choose to enable SMS notifications.</li>
              <li><strong>Volunteer profile data:</strong> Church affiliation, assigned roles, availability, family group membership, and serving preferences.</li>
              <li><strong>Usage data:</strong> Pages visited, actions taken within the dashboard, and device/browser information collected automatically via standard web logs.</li>
              <li><strong>Billing information:</strong> Payment details are handled directly by Stripe and are not stored on our servers. We receive limited billing status information (e.g., subscription plan, renewal date) from Stripe.</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul>
              <li>To create and manage your volunteer account and church profile.</li>
              <li>To schedule you for volunteer roles and send related notifications.</li>
              <li>To send SMS reminders about upcoming assignments, if you have opted in.</li>
              <li>To process subscription payments for church administrator accounts via Stripe.</li>
              <li>To respond to support requests and communicate service updates.</li>
              <li>To improve our platform and troubleshoot issues.</li>
            </ul>
          </Section>

          <Section title="3. SMS Communications">
            <p>
              If you provide a phone number and opt in to text message notifications, we will send you
              automated SMS messages about your volunteer assignments, upcoming services, schedule changes,
              and substitution requests. Message frequency varies — typically 2–8 messages per month.
              Message and data rates may apply.
            </p>
            <p>
              <strong>You can opt out at any time</strong> by replying <strong>STOP</strong> to any message,
              or by disabling SMS notifications in your account profile. Reply <strong>HELP</strong> for
              assistance or contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2 hover:text-foreground">
                {CONTACT_EMAIL}
              </a>.
            </p>
            <p>Consent to receive SMS messages is not required to use Parish Scribe or to volunteer.</p>
          </Section>

          <Section title="4. How We Share Your Information">
            <p>We do not sell your personal information. We share information only as follows:</p>
            <ul>
              <li><strong>With your church administrators:</strong> Your name, email, role assignments, and availability are visible to the administrators of the church you are associated with.</li>
              <li><strong>With service providers:</strong> We use Firebase (Google) for authentication and database services, Stripe for payment processing, and Twilio for SMS delivery. These providers process data only to support our service.</li>
              <li><strong>As required by law:</strong> We may disclose information if required to do so by applicable law or legal process.</li>
            </ul>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We retain your account data for as long as your account remains active or as needed to provide
              services. Church administrators may delete volunteer accounts at any time. You may request
              deletion of your account by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2 hover:text-foreground">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </Section>

          <Section title="6. Security">
            <p>
              We use industry-standard security measures including Firebase Authentication, Firestore
              security rules, and HTTPS encryption. However, no method of transmission over the internet
              is completely secure.
            </p>
          </Section>

          <Section title="7. Children's Privacy">
            <p>
              Parish Scribe is not directed to children under the age of 13. We do not knowingly collect
              personal information from children under 13.
            </p>
          </Section>

          <Section title="8. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify users of material
              changes by posting the new policy on this page with an updated date.
            </p>
          </Section>

          <Section title="9. Contact Us">
            <p>
              If you have questions about this Privacy Policy or your data, please contact us at{" "}
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
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
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
