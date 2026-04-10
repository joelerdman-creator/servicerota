/**
 * Server-only Stripe client. Never import this in client components.
 * For plan definitions and types, import from @/lib/plans instead.
 */
import Stripe from "stripe";

export { PLANS, planIdFromPriceId } from "./plans";
export type { PlanId } from "./plans";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia", typescript: true });
}
