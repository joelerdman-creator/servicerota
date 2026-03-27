import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // --- Dynamic Import of Admin SDK ---
  const { auth: adminAuth } = await import("@/firebase/admin-app");

  if (!adminAuth) {
    console.error("/api/auth/token-from-id: Admin Auth service is not available.");
    return NextResponse.json(
      { error: "The authentication service is not available." },
      { status: 503 },
    );
  }
  // --- End Dynamic Import ---

  try {
    const { idToken } = (await request.json()) as { idToken: string };
    const sessionCookie = (await cookies()).get("__session")?.value || "";

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 });
    }
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the session cookie of the user making the request (the super user).
    const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    // CRITICAL: Check if the calling user is a super user.
    if (decodedIdToken.superUser !== true) {
      return NextResponse.json(
        {
          error: "Forbidden: You do not have permission to perform this action.",
        },
        { status: 403 },
      );
    }

    // If the caller is a super user, verify the ID token they provided
    // and create a custom token for that user.
    const decodedTargetToken = await adminAuth.verifyIdToken(idToken);
    const targetUid = decodedTargetToken.uid;

    const customToken = await adminAuth.createCustomToken(targetUid);

    return NextResponse.json({ customToken });
  } catch (error: unknown) {
    console.error("Token generation error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create custom token";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
