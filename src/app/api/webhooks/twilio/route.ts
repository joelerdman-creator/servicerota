import { NextResponse } from "next/server";
import { firestore } from "@/firebase/admin-app";
import { FieldValue } from "firebase-admin/firestore";

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    
    const from = params.get("From");
    const body = params.get("Body")?.trim().toUpperCase();

    if (!from || !body) {
      return new NextResponse("Missing From or Body", { status: 400 });
    }

    const isOptOut = ["STOP", "END", "CANCEL", "UNSUBSCRIBE", "QUIT"].includes(body);
    const isOptIn = ["START", "YES", "UNSTOP"].includes(body);

    if (!isOptOut && !isOptIn) {
      // We only care about consent changes
      return new NextResponse("<Response></Response>", {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (!firestore) throw new Error("Firestore not initialized");

    const e164Phone = toE164(from);
    
    // Find the volunteer with this phone number
    const snap = await firestore
      .collection("users")
      .where("phone", "==", e164Phone)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      const optedIn = isOptIn;
      
      const updateData: Record<string, any> = {
        smsOptIn: optedIn,
        smsOptInAt: optedIn ? FieldValue.serverTimestamp() : null,
        smsOptInHistory: FieldValue.arrayUnion({
          optedIn,
          phone: e164Phone,
          at: new Date().toISOString(),
          reason: body, // e.g. "STOP"
        }),
      };

      await doc.ref.update(updateData);
      console.log(`Updated consent for ${e164Phone} to ${optedIn} (reason: ${body})`);
    }

    // Twilio expects TwiML in response
    return new NextResponse("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Twilio Webhook Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
