import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { auth: adminAuth } = await import("@/firebase/admin-app");

  if (!adminAuth) {
    return NextResponse.json({ error: "Auth service unavailable." }, { status: 503 });
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value || "";

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (decodedToken.superUser !== true) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { uids } = (await request.json()) as { uids: string[] };
    if (!Array.isArray(uids) || uids.length === 0) {
      return NextResponse.json({ error: "uids array is required" }, { status: 400 });
    }

    const results = await Promise.all(
      uids.map(async (uid) => {
        const user = await adminAuth.getUser(uid);
        return { uid, claims: user.customClaims ?? {} };
      }),
    );

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error("Get Claims Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch claims";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
