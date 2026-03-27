// src/app/api/auth/seed-super-user/route.ts
import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Allow in development or if a specific flag is set
  if (process.env.NODE_ENV !== "development" && process.env.ENABLE_SEED_ENDPOINT !== "true") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode." },
      { status: 403 },
    );
  }

  // Check for environment variables
  if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
     return NextResponse.json(
       { error: "Server configuration error: Missing Firebase credentials in environment." },
       { status: 500 }
     );
   }

  // --- Dynamic Import of Admin SDK ---
  let adminAuth;
  let initError;
  let debugInfo;
  try {
    const module = await import("@/firebase/admin-app");
    adminAuth = module.auth;
    initError = module.initError;
    debugInfo = module.debugInfo;
  } catch (error) {
    return NextResponse.json(
      { error: `Internal Server Error: Failed to load Admin SDK module. ${error}` },
      { status: 500 },
    );
  }

  if (!adminAuth) {
    console.error("/api/auth/seed-super-user: Admin Auth service is not available.");
    return NextResponse.json(
      { 
        error: "The authentication service is not available.",
        details: initError ? initError.message : "Unknown initialization error.",
        debug: debugInfo
      },
      { status: 503 },
    );
  }
  // --- End Dynamic Import ---

  try {
    const body = await request.json();
    const { uid, secret } = body as {
      uid: string;
      secret: string;
    };

    if (!uid || !secret) {
      return NextResponse.json({ error: "UID and secret are required." }, { status: 400 });
    }

    const expectedSecret = process.env.SUPER_USER_SEED_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        {
          error: "SUPER_USER_SEED_SECRET is not set in environment variables.",
        },
        { status: 500 },
      );
    }

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid secret." }, { status: 403 });
    }

    await adminAuth.setCustomUserClaims(uid, { superUser: true });

    return NextResponse.json({
      success: true,
      message: `Successfully set superUser claim for user ${uid}`,
    });
  } catch (error: unknown) {
    console.error("Seed Super User Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to set claim";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
