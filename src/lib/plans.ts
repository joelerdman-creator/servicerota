/**
 * Plan definitions — safe to import on both client and server.
 * No Stripe SDK dependency here.
 */

export const PLANS = {
  free: {
    id: "free",
    name: "Parish Starter",
    volunteerLimit: 20,
    smsMonthlyLimit: 0,
    features: {
      autoAssign: false,
      calendarFeeds: false,
      availabilityReminders: false,
      eventReminders: false,
      smsNotifications: false,
      multiCampus: false,
    },
  },
  pro: {
    id: "pro",
    name: "Parish Standard",
    volunteerLimit: 150,
    smsMonthlyLimit: 500,
    prices: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL,
    },
    features: {
      autoAssign: true,
      calendarFeeds: true,
      availabilityReminders: true,
      eventReminders: true,
      smsNotifications: true,
      multiCampus: false,
    },
  },
  growth: {
    id: "growth",
    name: "Parish Pro",
    volunteerLimit: 500,
    smsMonthlyLimit: 1500,
    prices: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_ANNUAL,
    },
    features: {
      autoAssign: true,
      calendarFeeds: true,
      availabilityReminders: true,
      eventReminders: true,
      smsNotifications: true,
      multiCampus: false,
    },
  },
  multi_site: {
    id: "multi_site",
    name: "Multi-Site",
    volunteerLimit: -1,
    smsMonthlyLimit: -1,
    prices: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MULTISITE_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_MULTISITE_ANNUAL,
    },
    features: {
      autoAssign: true,
      calendarFeeds: true,
      availabilityReminders: true,
      eventReminders: true,
      smsNotifications: true,
      multiCampus: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;

/** Resolve a Stripe price ID back to a plan ID (server-side use) */
export function planIdFromPriceId(priceId: string): PlanId {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (key === "free") continue;
    const p = plan as { prices: { monthly?: string; annual?: string } };
    if (p.prices.monthly === priceId || p.prices.annual === priceId) {
      return key as PlanId;
    }
  }
  return "free";
}
