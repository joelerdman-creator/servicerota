import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { PLANS, PlanId } from "@/lib/plans";

/**
 * POST /api/stripe/change-plan
 * Body: { planId: PlanId, interval: 'monthly' | 'annual' }
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

  const { planId, interval } = await request.json() as { planId: PlanId; interval: "monthly" | "annual" };
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
    if (!churchId) return NextResponse.json({ error: "No church found" }, { status: 400 });

    const churchDoc = await firestore.collection("churches").doc(churchId).get();
    const church = churchDoc.data();
    if (!church?.subscriptionId) return NextResponse.json({ error: "No active subscription" }, { status: 400 });

    const subscription = await getStripe().subscriptions.retrieve(church.subscriptionId);
    const itemId = subscription.items.data[0]?.id;
    const newPriceId = plan.prices[interval].trim();

    await getStripe().subscriptions.update(church.subscriptionId, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "create_prorations",
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
