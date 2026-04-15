import { PLANS, PlanId } from "./plans";

export interface ChurchSubscription {
  planId?: PlanId;
  subscriptionStatus?: string;
  currentPeriodEnd?: number;
  /** True once a Stripe customer exists. Sensitive IDs are in the billing subcollection. */
  hasStripeCustomer?: boolean;
  smsMonthlyLimit?: number;
}

/** Returns the effective plan, defaulting to free */
export function getEffectivePlan(church: ChurchSubscription): PlanId {
  if (!church.planId || church.planId === "free") return "free";
  const status = church.subscriptionStatus;
  if (status === "active" || status === "trialing") return church.planId;
  return "free";
}

export function canUseFeature(
  church: ChurchSubscription,
  feature: keyof (typeof PLANS)["pro"]["features"],
): boolean {
  const planId = getEffectivePlan(church);
  return PLANS[planId].features[feature] ?? false;
}

export function getVolunteerLimit(church: ChurchSubscription): number {
  const planId = getEffectivePlan(church);
  return PLANS[planId].volunteerLimit;
}

export function getSmsMonthlyLimit(church: ChurchSubscription): number {
  const planId = getEffectivePlan(church);
  // Allow override stored on church doc (e.g. for custom deals)
  if (typeof church.smsMonthlyLimit === "number") return church.smsMonthlyLimit;
  return PLANS[planId].smsMonthlyLimit;
}

/** Returns true if the church can send more SMS this month */
export function canSendSms(church: ChurchSubscription, usedThisMonth: number): boolean {
  const limit = getSmsMonthlyLimit(church);
  if (limit === -1) return true;   // unlimited
  if (limit === 0) return false;   // free plan
  return usedThisMonth < limit;
}

/** Overage rate in cents charged to church (displayed in dashboard) */
export const SMS_OVERAGE_RATE_CENTS = 2; // $0.02/SMS
