
import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // --- Dynamic Import of Admin SDK ---
  const { auth: adminAuth } = await import("@/firebase/admin-app");

  if (!adminAuth) {
    console.error("/api/auth/impersonate: Admin Auth service is not available.");
    return NextResponse.json(
      { error: "The authentication service is not available." },
      { status: 503 },
    );
  }
  // --- End Dynamic Import ---

  try {
    const { targetUid } = (await request.json()) as { targetUid: string };
    const sessionCookie = (await cookies()).get("__session")?.value || "";

    if (!targetUid) {
      return NextResponse.json({ error: "Target UID is required" }, { status: 400 });
    }
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the session cookie of the user trying to impersonate.
    const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    // CRITICAL: Check if the calling user is a super user via custom claims.
    if (decodedIdToken.superUser !== true) {
      return NextResponse.json(
        {
          error: "Forbidden: You do not have permission to impersonate users.",
        },
        { status: 403 },
      );
    }

    // If the caller is a super user, create a custom token for the target user.
    // Add a claim to mark this as an impersonated session.
    const customToken = await adminAuth.createCustomToken(targetUid, { impersonatedBySuperUser: true });

    return NextResponse.json({ customToken });
  } catch (error: unknown) {
    console.error("Impersonation Error:", error);
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
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create impersonation token";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
