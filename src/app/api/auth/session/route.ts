import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check for environment variables before even trying to import the admin app
  if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    console.error("Missing Firebase Admin credentials in environment variables.");
    return NextResponse.json(
      { error: "Server configuration error: Missing Firebase credentials." },
      { status: 500 }
    );
  }

  // --- Dynamic Import of Admin SDK ---
  let adminAuth;
  try {
    const module = await import("@/firebase/admin-app");
    adminAuth = module.auth;
  } catch (error) {
    console.error("/api/auth/session: Failed to import Admin SDK:", error);
    return NextResponse.json(
      { error: "Internal Server Error: Failed to load Admin SDK" },
      { status: 500 },
    );
  }

  if (!adminAuth) {
    console.error("/api/auth/session: Admin Auth service is not available (auth is null).");
    return NextResponse.json(
      { error: "The authentication service is not available." },
      { status: 503 },
    );
  }
  // --- End Dynamic Import ---

  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 });
    }
    const { idToken } = body;

    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });
    const options = {
      name: "__session",
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
    };

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(options);

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error creating session cookie:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create session",
      },
      { status: 401 },
    );
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    // Just delete the cookie. No Admin SDK needed.
    const cookieStore = await cookies();
    cookieStore.delete("__session");
    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting session cookie:", error);
    return NextResponse.json(
      { error: "Failed to delete session cookie" },
      { status: 500 }
    );
  }
}
