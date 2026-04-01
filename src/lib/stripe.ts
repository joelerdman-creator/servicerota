/**
 * Server-only Stripe client. Never import this in client components.
 * For plan definitions and types, import from @/lib/plans instead.
 */
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
  typescript: true,
});

export { PLANS, planIdFromPriceId } from "./plans";
export type { PlanId } from "./plans";
