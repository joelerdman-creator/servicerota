"use server";

import { firestore } from "@/firebase/admin-app";
import { sendEmail } from "@/lib/email";
import { FieldValue } from "firebase-admin/firestore";

export interface JoinRequestInput {
  churchId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  smsOptIn?: boolean;
  requestedRoleIds: string[];
  requestedRoleNames: string[];
}

export interface JoinRequestResult {
  ok: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Claim existing admin-managed account
// ---------------------------------------------------------------------------

export interface ClaimAccountResult {
  ok: boolean;
  /** "found" = email matched and link sent, "not_found" = no match */
  status?: "found" | "not_found";
  error?: string;
}

export async function sendClaimLink(
  churchId: string,
  email: string,
  origin: string,
): Promise<ClaimAccountResult> {
  if (!firestore) return { ok: false, error: "Server configuration error." };

  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: false, error: "Please enter your email address." };

  try {
    // Look for an admin-managed volunteer with this email in this church
    const snap = await firestore
      .collection("users")
      .where("churchId", "==", churchId)
      .where("email", "==", normalized)
      .where("isManagedByAdmin", "==", true)
      .limit(1)
      .get();

    if (snap.empty) {
      // Don't reveal whether the email exists — just say "if found, we sent it"
      return { ok: true, status: "not_found" };
    }

    const docId = snap.docs[0].id;
    const data  = snap.docs[0].data();
    const firstName = data.firstName ?? "there";

    // Fetch church name for the email copy
    const churchSnap = await firestore.collection("churches").doc(churchId).get();
    const churchName = churchSnap.exists ? (churchSnap.data()?.name ?? "your church") : "your church";

    const claimUrl = `${origin}/claim-account?token=${docId}`;

    await sendEmail({
      to: [normalized],
      subject: `Claim your volunteer account at ${churchName}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
          <h2 style="margin-bottom:4px;">Hi ${firstName},</h2>
          <p style="color:#555;">
            You requested a link to claim your volunteer account at <strong>${churchName}</strong>.
          </p>
          <p style="color:#555;">Click the button below to sign in with Google and link your account.
          This link expires after 24 hours and can only be used once.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${claimUrl}"
               style="background:#103f83;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">
              Claim My Account
            </a>
          </p>
          <p style="color:#888;font-size:12px;">
            If you didn't request this, you can safely ignore this email.
            Your account will not change unless you click the button above.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#bbb;font-size:11px;">
            Or copy and paste this URL into your browser:<br/>
            ${claimUrl}
          </p>
        </div>
      `,
    });

    return { ok: true, status: "found" };
  } catch (e: any) {
    console.error("[sendClaimLink]", e);
    return { ok: false, error: "Failed to send the claim link. Please try again." };
  }
}

export async function submitJoinRequest(input: JoinRequestInput): Promise<JoinRequestResult> {
  if (!firestore) return { ok: false, error: "Server configuration error." };

  const { churchId, firstName, lastName, email, phone, smsOptIn, requestedRoleIds, requestedRoleNames } = input;

  if (!firstName.trim() || !lastName.trim() || !email.trim()) {
    return { ok: false, error: "Name and email are required." };
  }

  try {
    // 1. Create the pending user doc
    const userRef = firestore.collection("users").doc();
    await userRef.set({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      smsOptIn: smsOptIn ?? false,
      churchId,
      status: "pending_approval",
      role: "volunteer",
      isAdmin: false,
      isManagedByAdmin: false,
      availableRoleIds: requestedRoleIds,
      requestedRoleNames,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 2. Fetch church name + admin emails to notify
    const churchSnap = await firestore.collection("churches").doc(churchId).get();
    const churchName = churchSnap.exists ? (churchSnap.data()?.name ?? "your church") : "your church";

    const adminsSnap = await firestore
      .collection("users")
      .where("churchId", "==", churchId)
      .where("isAdmin", "==", true)
      .where("status", "==", "active")
      .get();

    const adminEmails: string[] = [];
    adminsSnap.forEach((doc) => {
      const e = doc.data().email;
      if (e) adminEmails.push(e);
    });

    // 3. Notify admins
    if (adminEmails.length > 0) {
      const roleList = requestedRoleNames.length > 0
        ? `<ul style="margin:8px 0 0 20px;padding:0;">${requestedRoleNames.map(r => `<li>${r}</li>`).join("")}</ul>`
        : "<p style='color:#666;'>No specific roles selected.</p>";

      await sendEmail({
        to: adminEmails,
        subject: `New volunteer request: ${firstName} ${lastName} — ${churchName}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="margin-bottom:4px;">New Volunteer Request</h2>
            <p style="color:#555;margin-top:0;">${churchName}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
            <p><strong>${firstName} ${lastName}</strong> has submitted a volunteer request via your church's join page.</p>
            <p style="margin:0;"><strong>Email:</strong> ${email}</p>
            ${phone ? `<p style="margin:4px 0;"><strong>Phone:</strong> ${phone}</p>` : ""}
            <p style="margin:8px 0 4px;"><strong>Roles requested:</strong></p>
            ${roleList}
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p>Review and approve this request from your <strong>Volunteers</strong> dashboard.</p>
          </div>
        `,
      });
    }

    return { ok: true };
  } catch (e: any) {
    console.error("[submitJoinRequest]", e);
    return { ok: false, error: "Failed to submit your request. Please try again." };
  }
}
