import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // --- Dynamic Import of Admin SDK ---
  const { auth: adminAuth } = await import("@/firebase/admin-app");

  if (!adminAuth) {
    console.error("/api/auth/set-claim: Admin Auth service is not available.");
    return NextResponse.json(
      { error: "The authentication service is not available." },
      { status: 503 },
    );
  }
  // --- End Dynamic Import ---

  try {
    const { targetUid, claim, value } = (await request.json()) as {
      targetUid: string;
      claim: string;
      value: any;
    };
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value || "";

    if (!targetUid || !claim || value === undefined) {
      return NextResponse.json(
        { error: "targetUid, claim, and value are required" },
        { status: 400 },
      );
    }
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    if (decodedIdToken.superUser !== true) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to set claims." },
        { status: 403 },
      );
    }

    const user = await adminAuth.getUser(targetUid);
    const existingClaims = user.customClaims || {};

    await adminAuth.setCustomUserClaims(targetUid, {
      ...existingClaims,
      [claim]: value,
    });

    return NextResponse.json({
      success: true,
      message: `Claim '${claim}' set to '${String(value)}' for user ${targetUid}.`,
    });
  } catch (error: unknown) {
    console.error("Set Claim Error:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "auth/session-cookie-expired"
    ) {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 },
      );
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to set claim";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
