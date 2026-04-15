import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLANS, PlanId } from "@/lib/stripe";

/**
 * POST /api/stripe/create-checkout
 * Body: { planId: PlanId, interval: 'monthly' | 'annual' }
 */
export async function POST(request: NextRequest) {
  // Dynamic import mirrors the pattern used by /api/auth/session
  let adminAuth: any;
  let firestore: any;
  try {
    const module = await import("@/firebase/admin-app");
    adminAuth = module.auth;
    firestore = module.firestore;
  } catch (e: any) {
    return NextResponse.json({ error: "Server not configured", detail: e?.message }, { status: 500 });
  }

  if (!adminAuth || !firestore) {
    return NextResponse.json({ error: "Server not configured", detail: "adminAuth or firestore is null" }, { status: 500 });
  }

  // Verify Firebase auth token
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.split("Bearer ")[1];
  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid token", detail: e?.message }, { status: 401 });
  }

  const body = await request.json();
  const { planId, interval } = body as { planId: PlanId; interval: "monthly" | "annual" };

  if (!planId || planId === "free" || !interval) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const plan = PLANS[planId];
  if (!("prices" in plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const userDoc = await firestore.collection("users").doc(uid).get();
    const churchId: string = userDoc.data()?.churchId;
    if (!churchId) {
      return NextResponse.json({ error: "No church associated with account" }, { status: 400 });
    }

    const [churchDoc, billingDoc] = await Promise.all([
      firestore.collection("churches").doc(churchId).get(),
      firestore.collection("churches").doc(churchId).collection("billing").doc("config").get(),
    ]);
    const church = churchDoc.data() || {};
    const billing = billingDoc.data() || {};

    const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "";
    const priceId = plan.prices[interval];

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      customer: billing.stripeCustomerId || undefined,
      customer_email: !billing.stripeCustomerId ? (userDoc.data()?.email || undefined) : undefined,
      metadata: { churchId },
      subscription_data: { metadata: { churchId } },
      success_url: `${baseUrl}/dashboard/admin/billing?success=true`,
      cancel_url: `${baseUrl}/dashboard/admin/billing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("[create-checkout] error:", e?.message);
    return NextResponse.json({ error: "Checkout failed", detail: e?.message }, { status: 500 });
  }
}
