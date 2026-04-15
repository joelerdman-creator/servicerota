import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/stripe/cancel
 * Cancels the subscription at the end of the current billing period.
 */
export async function POST(request: NextRequest) {
  let adminAuth: any;
  let firestore: any;
  try {
    const module = await import("@/firebase/admin-app");
    adminAuth = module.auth;
    firestore = module.firestore;
  } catch (e: any) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  if (!adminAuth || !firestore) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.split("Bearer ")[1];
  if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const userDoc = await firestore.collection("users").doc(uid).get();
    const churchId: string = userDoc.data()?.churchId;
    if (!churchId) return NextResponse.json({ error: "No church found" }, { status: 400 });

    const billingDoc = await firestore.collection("churches").doc(churchId).collection("billing").doc("config").get();
    const billing = billingDoc.data();
    if (!billing?.subscriptionId) return NextResponse.json({ error: "No active subscription" }, { status: 400 });

    await getStripe().subscriptions.update(billing.subscriptionId, {
      cancel_at_period_end: true,
    });

    // Reflect the pending cancellation in Firestore immediately
    await firestore.collection("churches").doc(churchId).update({
      subscriptionStatus: "canceling",
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
