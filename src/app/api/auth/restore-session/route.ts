import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { auth: adminAuth } = await import("@/firebase/admin-app");

  if (!adminAuth) {
    return NextResponse.json({ error: "Auth service unavailable." }, { status: 503 });
  }

  try {
    const { idToken } = (await request.json()) as { idToken: string };
    if (!idToken) {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }

    // Verify the original token is legitimate before restoring
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.superUser !== true) {
      return NextResponse.json({ error: "Forbidden: original token is not a super user." }, { status: 403 });
    }

    const customToken = await adminAuth.createCustomToken(decoded.uid, { superUser: true });
    return NextResponse.json({ customToken });
  } catch (error: unknown) {
    console.error("Restore Session Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to restore session";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
