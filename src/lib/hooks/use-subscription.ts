"use client";

import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { getEffectivePlan, canUseFeature, getSmsMonthlyLimit } from "@/lib/subscription";
import type { ChurchSubscription } from "@/lib/subscription";
import type { PlanId } from "@/lib/plans";
import { PLANS } from "@/lib/plans";

interface UserProfile {
  churchId?: string;
}

interface UseSubscriptionResult {
  planId: PlanId;
  planName: string;
  isActive: boolean;
  isPastDue: boolean;
  isLoading: boolean;
  canUse: (feature: keyof (typeof PLANS)["pro"]["features"]) => boolean;
  volunteerLimit: number;
  smsMonthlyLimit: number;
}

export function useSubscription(): UseSubscriptionResult {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const churchDocRef = useMemoFirebase(
    () => (userProfile?.churchId && firestore ? doc(firestore, "churches", userProfile.churchId) : null),
    [userProfile?.churchId, firestore],
  );
  const { data: church, isLoading: isChurchLoading } = useDoc<ChurchSubscription>(churchDocRef);

  const isLoading = isUserLoading || isProfileLoading || isChurchLoading;
  const planId = church ? getEffectivePlan(church) : "free";
  const status = church?.subscriptionStatus;

  return {
    planId,
    planName: PLANS[planId].name,
    isActive: status === "active" || status === "trialing",
    isPastDue: status === "past_due",
    isLoading,
    canUse: (feature) => (church ? canUseFeature(church, feature) : false),
    volunteerLimit: PLANS[planId].volunteerLimit,
    smsMonthlyLimit: church ? getSmsMonthlyLimit(church) : 0,
  };
}
