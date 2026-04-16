# ParishScribe — Web App Context for Claude

## Project Summary
**ParishScribe** is a volunteer scheduling SaaS platform for Catholic and Christian churches. Admins create events, assign volunteers to roles, and send SMS/email reminders. Volunteers view their schedule, sign up for open roles, request trades, and manage availability.

- **Firebase project:** `servicerotav1`
- **Production domain:** `parishscribe.com`
- **Contact email:** `admin@parishscribe.com`
- **Repo location:** `c:\Users\joele\.gemini\antigravity\scratch\firebase-project`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui components |
| Auth | Firebase Auth — Google Sign-In (web) |
| Database | Cloud Firestore |
| Storage | Firebase Storage |
| Payments | Stripe (subscriptions) |
| SMS | Custom SMS pipeline via Genkit / Google AI |
| AI | Genkit + Google GenAI (`@genkit-ai/google-genai`) |
| Hosting | Firebase Hosting (deployed via Firebase Console) |
| Admin SDK | `firebase-admin` — used only in API routes (`/src/app/api/`) |

---

## Repository Structure

```
src/
  app/
    api/                    ← Server-side API routes (Admin SDK only here)
      auth/                 ← Session management
      stripe/               ← Billing: checkout, portal, cancel, change-plan
      webhooks/stripe/      ← Stripe webhook handler
      cron/                 ← Scheduled jobs
      generate-events/      ← AI event generation
      generate-flyer/       ← AI flyer generation
      log-notification/     ← Notification logging
    dashboard/
      admin/                ← Admin dashboard (events, volunteers, billing, etc.)
      volunteer/            ← Volunteer dashboard (schedule, roles, availability, profile)
      superuser/            ← Internal superuser tools
      onboarding/           ← New church onboarding
      role-selection/       ← Role picker after first sign-in
    claim-account/          ← Volunteer invite claim flow
  firebase/                 ← Firebase client init, hooks (useUser, useDoc, etc.)
  lib/                      ← Shared utilities (subscription.ts, stripe.ts, plans.ts)
  components/               ← Shared UI components
```

---

## User Roles & Access Levels

| Role | Description |
|---|---|
| `superUser` | Internal admin — full access to all data. Set via custom Auth claim only. |
| `admin` | Church admin — manages their church's events, volunteers, billing. |
| `volunteer` | Regular volunteer — views schedule, signs up for roles, manages preferences. |

- Role is stored on the Firestore user doc (`role`, `isAdmin` fields).
- `superUser` is determined **solely** by a Firebase custom claim — never by a Firestore field.

---

## Firestore Collections

```
/users/{userId}               ← User profiles (note: invited volunteers use random doc ID, not UID)
/invitations/{token}          ← Minimal invite data for claim-account flow (token = secret)
/churches/{churchId}          ← Church profiles (publicly readable — no sensitive data here)
  /billing/config             ← Stripe IDs: stripeCustomerId, subscriptionId (admin-only)
  /events/{eventId}           ← Events
    /roles/{roleId}           ← Volunteer role slots per event
  /role_templates/{id}        ← Available role types for a church
  /service_templates/{id}     ← Service/Mass templates
  /series_metadata/{id}       ← Recurring series metadata
  /role_requests/{id}         ← Volunteer requests for new roles
  /trade_requests/{id}        ← Shift-swap requests between volunteers
  /usage/{monthKey}           ← SMS usage counters (server-write only)
  /notifications/{id}         ← Notification log (server-write only)
/graphic_assets/{id}          ← Stock images for flyers (admin-read, superuser-write)
/support_tickets/{id}         ← User-submitted support tickets
  /comments/{id}              ← Ticket comments
```

---

## Firestore Security Rules — Key Principles

1. **`stripeCustomerId` and `subscriptionId` never live on the church doc.** They are in `/churches/{id}/billing/config` (admin-only subcollection). The church doc only holds `planId`, `subscriptionStatus`, `currentPeriodEnd`, `hasStripeCustomer`.

2. **Privilege escalation is blocked at the rules level.** `isSelfUpdateSafe()` prevents users from writing `isAdmin`, `role`, `churchId`, `status`, or `isManagedByAdmin` on their own profile.

3. **`superUser` is a custom claim only** — never derived from Firestore data.

4. **Pending invitations are no longer read from `/users`.** The claim-account flow reads `/invitations/{token}` (publicly readable, token is the secret). User docs require authentication to read.

5. **`role_requests` list queries must include a `where('volunteerId','==',uid)` filter** for non-admin users. The rule enforces this via `resource.data.volunteerId == request.auth.uid`.

6. **`usage` and `notifications` subcollections are `allow write: if false`** — server-side Admin SDK only.

---

## Billing Architecture

- **Non-sensitive** fields on church doc: `planId`, `subscriptionStatus`, `currentPeriodEnd`, `hasStripeCustomer`
- **Sensitive** fields in `/churches/{id}/billing/config`: `stripeCustomerId`, `subscriptionId`
- All Stripe API routes read from the billing subcollection, not the church doc
- Stripe webhook uses `collectionGroup("billing")` query to look up churches for invoice events

---

## Volunteer Invite / Claim Flow

1. Admin creates volunteer → writes `/users/{randomId}` + `/invitations/{randomId}`
2. Email sent with `claimUrl = /claim-account?token={randomId}`
3. Claim page reads `/invitations/{token}` (public) for display info
4. Volunteer signs in with Google → `updateDoc(/users/{token})` with their UID
5. Invitation doc stays (not deleted on claim — only deleted when admin denies/removes)

---

## Mobile App Access (Password Auth)

Web uses Google Sign-In only. The companion mobile app uses email/password because Google Sign-In via Expo Go is not supported in SDK 54.

- Volunteers set a password at **My Profile → Mobile App Access**
- This calls `linkWithCredential(user, EmailAuthProvider.credential(email, password))`
- Links the password provider to their existing Google account — web sign-in unchanged
- Mobile app uses `signInWithEmailAndPassword`

---

## Companion Mobile App

- **Repo:** `c:\Users\joele\.gemini\antigravity\scratch\parish-scribe-mobile`
- **Stack:** Expo SDK 54, React Native, TypeScript
- **Same Firebase project** (`servicerotav1`) — same Firestore rules apply
- **Auth:** Email/password (Google Sign-In deferred to production EAS build)
- See `parish-scribe-mobile/CLAUDE.md` for mobile-specific context
