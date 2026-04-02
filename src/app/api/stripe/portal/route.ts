import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/stripe/portal
 */
export async function POST(request: NextRequest) {
  let adminAuth: any;
  let firestore: any;
  try {
    const module = await import("@/firebase/admin-app");
    adminAuth = module.auth;
    firestore = module.firestore;
  } catch {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  if (!adminAuth || !firestore) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.split("Bearer ")[1];
  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const userDoc = await firestore.collection("users").doc(uid).get();
  const churchId: string = userDoc.data()?.churchId;
  if (!churchId) {
    return NextResponse.json({ error: "No church found" }, { status: 400 });
  }

  const churchDoc = await firestore.collection("churches").doc(churchId).get();
  const stripeCustomerId: string = churchDoc.data()?.stripeCustomerId;
  if (!stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 });
  }

  const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "";

  const session = await getStripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${baseUrl}/dashboard/admin/billing`,
  });

  return NextResponse.json({ url: session.url });
}
