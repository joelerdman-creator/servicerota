"use server";

import Twilio from "twilio";
import { firestore } from "@/firebase/admin-app";
import { FieldValue } from "firebase-admin/firestore";
import { canSendSms } from "./subscription";

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.warn("SMS sending is disabled. TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not set.");
}

const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const fromNumber = process.env.TWILIO_PHONE_NUMBER || "";

interface SmsParams {
  to: string;
  body: string;
  /** churchId is required for plan-based SMS cap enforcement */
  churchId?: string;
}

/** Returns current month key like "2026-04" */
function usageMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Reads SMS used this month for a church */
async function getSmsUsedThisMonth(churchId: string): Promise<number> {
  if (!firestore) return 0;
  const usageDoc = await firestore
    .collection(`churches/${churchId}/usage`)
    .doc(usageMonthKey())
    .get();
  return usageDoc.exists ? (usageDoc.data()?.smsCount ?? 0) : 0;
}

/** Increments the SMS usage counter */
async function incrementSmsUsage(churchId: string): Promise<void> {
  if (!firestore) return;
  await firestore
    .collection(`churches/${churchId}/usage`)
    .doc(usageMonthKey())
    .set({ smsCount: FieldValue.increment(1) }, { merge: true });
}

export async function sendSms({ to, body, churchId }: SmsParams) {
  if (!client || !fromNumber) {
    console.warn("SMS not sent: Twilio credentials not configured.", { to });
    return { success: false, message: "Twilio not configured" };
  }

  // Enforce SMS cap if churchId is provided
  if (churchId && firestore) {
    const churchDoc = await firestore.collection("churches").doc(churchId).get();
    const church = churchDoc.data() ?? {};
    const used = await getSmsUsedThisMonth(churchId);

    if (!canSendSms(church, used)) {
      console.warn(`SMS cap reached for church ${churchId}: ${used} used this month`);
      return { success: false, message: "Monthly SMS limit reached" };
    }
  }

  try {
    const result = await client.messages.create({ body, from: fromNumber, to });
    console.log("SMS sent:", result.sid);

    if (churchId) await incrementSmsUsage(churchId);

    return { success: true, sid: result.sid };
  } catch (exception) {
    console.error("SMS send error:", exception);
    return { success: false, error: exception };
  }
}
