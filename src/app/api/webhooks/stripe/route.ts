import { NextRequest, NextResponse } from "next/server";
import { getStripe, planIdFromPriceId } from "@/lib/stripe";
import Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 *
 * Receives Stripe events and keeps the church's Firestore subscription
 * record in sync. The churchId is stored as metadata on the Stripe customer.
 */
export async function POST(request: NextRequest) {
  let firestore: any;
  try {
    const module = await import("@/firebase/admin-app");
    firestore = module.firestore;
  } catch (e: any) {
    console.error("[stripe-webhook] Failed to load admin-app:", e?.message);
    return new NextResponse("Server not configured", { status: 500 });
  }

  if (!firestore) {
    console.error("[stripe-webhook] firestore is null");
    return new NextResponse("Server not configured", { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Webhook signature missing", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET.trim());
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const churchId = session.metadata?.churchId;
        if (!churchId || !session.customer || !session.subscription) break;

        const subscription = await getStripe().subscriptions.retrieve(
          session.subscription as string,
        );
        const priceId = subscription.items.data[0]?.price.id;
        const planId = planIdFromPriceId(priceId);

        await firestore.collection("churches").doc(churchId).update({
          stripeCustomerId: session.customer as string,
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          planId,
          currentPeriodEnd: subscription.current_period_end,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const churchId = subscription.metadata?.churchId;
        if (!churchId) break;

        const priceId = subscription.items.data[0]?.price.id;
        const planId = planIdFromPriceId(priceId);

        await firestore.collection("churches").doc(churchId).update({
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          planId,
          currentPeriodEnd: subscription.current_period_end,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const churchId = subscription.metadata?.churchId;
        if (!churchId) break;

        await firestore.collection("churches").doc(churchId).update({
          subscriptionStatus: "canceled",
          planId: "free",
          subscriptionId: null,
          currentPeriodEnd: null,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.customer) break;
        const snap = await firestore
          .collection("churches")
          .where("stripeCustomerId", "==", invoice.customer as string)
          .limit(1)
          .get();
        if (!snap.empty) {
          await snap.docs[0].ref.update({ subscriptionStatus: "past_due" });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.customer || invoice.billing_reason === "subscription_create") break;
        const snap = await firestore
          .collection("churches")
          .where("stripeCustomerId", "==", invoice.customer as string)
          .limit(1)
          .get();
        if (!snap.empty) {
          await snap.docs[0].ref.update({ subscriptionStatus: "active" });
        }
        break;
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error: any) {
    console.error("Stripe webhook handler error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
