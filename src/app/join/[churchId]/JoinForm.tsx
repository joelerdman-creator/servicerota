"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { submitJoinRequest, sendClaimLink } from "./actions";
import { CheckCircle2, Feather, Loader2, Mail, ChevronDown } from "lucide-react";

interface RoleTemplate {
  id: string;
  name: string;
}

interface JoinFormProps {
  churchId: string;
  churchName: string;
  logoUrl?: string;
  primaryColor?: string;
  roles: RoleTemplate[];
}

export default function JoinForm({ churchId, churchName, logoUrl, primaryColor, roles }: JoinFormProps) {
  const accent = primaryColor || "#103f83";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [smsOptIn, setSmsOptIn]   = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Claim existing account
  const [showClaimPanel, setShowClaimPanel] = useState(false);
  const [claimEmail, setClaimEmail]         = useState("");
  const [isClaimSending, setIsClaimSending] = useState(false);
  const [claimSent, setClaimSent]           = useState(false);
  const [claimError, setClaimError]         = useState<string | null>(null);

  const handleSendClaimLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError(null);
    if (!claimEmail.trim()) {
      setClaimError("Please enter your email address.");
      return;
    }
    setIsClaimSending(true);
    const result = await sendClaimLink(churchId, claimEmail, window.location.origin);
    setIsClaimSending(false);
    if (!result.ok) {
      setClaimError(result.error ?? "Something went wrong.");
      return;
    }
    // Show the same success message whether or not we found a match —
    // prevents email enumeration.
    setClaimSent(true);
  };

  const toggleRole = (id: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Please fill in your first name, last name, and email.");
      return;
    }

    const selectedRoleObjects = roles.filter((r) => selectedRoles.has(r.id));
    setIsSubmitting(true);
    const result = await submitJoinRequest({
      churchId,
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      smsOptIn,
      requestedRoleIds: selectedRoleObjects.map((r) => r.id),
      requestedRoleNames: selectedRoleObjects.map((r) => r.name),
    });
    setIsSubmitting(false);

    if (result.ok) {
      setSuccess(true);
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-4">
        <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accent}18` }}>
          <CheckCircle2 className="h-8 w-8" style={{ color: accent }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Request submitted!</h2>
        <p className="text-gray-500 max-w-sm text-sm leading-relaxed">
          Thank you, {firstName}! Your request to volunteer at <strong>{churchName}</strong> has been received.
          An administrator will review your application and reach out to you soon.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Church header */}
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={`${churchName} logo`} className="h-10 w-10 object-contain rounded" />
        ) : (
          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}18` }}>
            <Feather className="h-5 w-5" style={{ color: accent }} />
          </div>
        )}
        <div>
          <p className="font-bold text-gray-900 leading-tight">{churchName}</p>
          <p className="text-xs text-gray-400">Volunteer Registration</p>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* Hero text */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">
              Serve with us
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Fill out the form below and our team will be in touch. Select the roles you're interested in and we'll match you where you're needed most.
            </p>
          </div>

          {/* ── Already in the system? Claim your account ── */}
          <div className="mb-6 rounded-2xl border bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowClaimPanel((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4 text-gray-400" />
                Already in our system? Claim your account
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showClaimPanel ? "rotate-180" : ""}`} />
            </button>

            {showClaimPanel && (
              <div className="px-5 pb-5 border-t pt-4 space-y-3">
                {claimSent ? (
                  <div className="flex flex-col items-center text-center gap-2 py-4">
                    <CheckCircle2 className="h-8 w-8" style={{ color: accent }} />
                    <p className="font-semibold text-gray-800 text-sm">Check your inbox</p>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                      If we have an account associated with that email address, we've sent you a link to claim it.
                      The link expires in 24 hours.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      If a {churchName} administrator already added you to the system, enter the email address
                      they used. We'll send you a secure link to connect your Google account.
                    </p>
                    <form onSubmit={handleSendClaimLink} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={claimEmail}
                        onChange={(e) => setClaimEmail(e.target.value)}
                        className="flex-1 text-sm"
                        required
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isClaimSending}
                        style={{ backgroundColor: accent, borderColor: accent }}
                        className="shrink-0 text-white"
                      >
                        {isClaimSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send Link"}
                      </Button>
                    </form>
                    {claimError && (
                      <p className="text-xs text-red-600">{claimError}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-6 space-y-5">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium">First name <span className="text-red-500">*</span></Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">Last name <span className="text-red-500">*</span></Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email address <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone number <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
              />
              {phone && (
                <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                  <div
                    className="flex items-start gap-2.5 cursor-pointer"
                    onClick={() => setSmsOptIn((v) => !v)}
                  >
                    <Checkbox
                      id="smsOptIn"
                      checked={smsOptIn}
                      onCheckedChange={(v) => setSmsOptIn(Boolean(v))}
                      className="mt-0.5 shrink-0"
                    />
                    <Label htmlFor="smsOptIn" className="text-sm cursor-pointer font-normal text-gray-700 leading-snug">
                      By checking this box, I consent to receive recurring automated SMS text messages
                      from <strong>Parish Scribe (Joel Erdman dba ParishScribe)</strong> at the mobile
                      number provided, including assignment confirmations, service reminders, and
                      substitution requests. Consent is not required to volunteer.
                    </Label>
                  </div>
                  <p className="text-xs text-gray-400 leading-snug pl-6">
                    Message and data rates may apply. Message frequency varies (typically 2–8/month).
                    Reply <strong>STOP</strong> to cancel, <strong>HELP</strong> for help.
                    See our{" "}
                    <a href="/privacy" className="underline underline-offset-2 hover:text-gray-600">Privacy Policy</a>
                    {" "}and{" "}
                    <a href="/terms" className="underline underline-offset-2 hover:text-gray-600">Terms of Service</a>.
                  </p>
                </div>
              )}
            </div>

            {/* Role selection */}
            {roles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Roles I'm interested in <span className="text-gray-400 font-normal">(select all that apply)</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                        selectedRoles.has(role.id)
                          ? "border-transparent text-white font-medium shadow-sm"
                          : "border-gray-200 text-gray-700 hover:border-gray-300 bg-white"
                      }`}
                      style={
                        selectedRoles.has(role.id)
                          ? { backgroundColor: accent, borderColor: accent }
                          : {}
                      }
                    >
                      <Checkbox
                        checked={selectedRoles.has(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                        className={`shrink-0 ${selectedRoles.has(role.id) ? "border-white data-[state=checked]:bg-white data-[state=checked]:text-primary" : ""}`}
                      />
                      {role.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full font-semibold py-5 text-base"
              disabled={isSubmitting}
              style={{ backgroundColor: accent, borderColor: accent }}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                "Submit Volunteer Request"
              )}
            </Button>

            <p className="text-xs text-center text-gray-400 leading-snug">
              Your information will only be shared with {churchName} administrators.
            </p>
          </form>

        </div>
      </main>

      <footer className="border-t py-4 px-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Joel Erdman dba ParishScribe. All rights reserved.
      </footer>
    </div>
  );
}
