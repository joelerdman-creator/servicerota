import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { planIdFromPriceId } from "@/lib/plans";

/**
 * POST /api/admin/sync-subscription
 * One-time use: syncs a Stripe subscription to the church Firestore doc.
 * Protected by CRON_SECRET_KEY. Remove after use.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret");
  if (secret !== process.env.CRON_SECRET_KEY?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let firestore: any;
  try {
    const module = await import("@/firebase/admin-app");
    firestore = module.firestore;
  } catch (e: any) {
    return NextResponse.json({ error: "Server not configured", detail: e?.message }, { status: 500 });
  }

  const { churchId, subscriptionId } = await request.json();
  if (!churchId || !subscriptionId) {
    return NextResponse.json({ error: "churchId and subscriptionId required" }, { status: 400 });
  }

  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    const planId = planIdFromPriceId(priceId);

    await firestore.collection("churches").doc(churchId).update({
      stripeCustomerId: subscription.customer as string,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      planId,
      currentPeriodEnd: subscription.current_period_end,
    });

    return NextResponse.json({ success: true, planId, status: subscription.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
