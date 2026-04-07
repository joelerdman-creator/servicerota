import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ??
  `${process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`;

async function verifySuperUser() {
  const { auth: adminAuth } = await import("@/firebase/admin-app");
  if (!adminAuth) throw new Error("Auth service unavailable.");
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value || "";
  if (!sessionCookie) throw Object.assign(new Error("Not authenticated"), { status: 401 });
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  if (decoded.superUser !== true) throw Object.assign(new Error("Forbidden"), { status: 403 });
  return decoded;
}

// POST — upload a new asset
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await verifySuperUser();
    const { storage: adminStorage, firestore: adminFirestore } = await import("@/firebase/admin-app");
    if (!adminStorage || !adminFirestore) {
      return NextResponse.json({ error: "Storage or Firestore unavailable." }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const denominationCluster = formData.get("denominationCluster") as string | null;
    const role = (formData.get("role") as string | null) ?? "flyer_hero";

    if (!file || !denominationCluster) {
      return NextResponse.json({ error: "file and denominationCluster are required." }, { status: 400 });
    }

    const assetId = crypto.randomUUID();
    const ext = file.name.split(".").pop() ?? "webp";
    const storagePath = `graphics/${role}/${denominationCluster}/${assetId}.${ext}`;

    const bucket = adminStorage.bucket(STORAGE_BUCKET);
    const fileRef = bucket.file(storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    await fileRef.save(buffer, {
      metadata: { contentType: file.type || "image/webp" },
    });
    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    await adminFirestore.collection("graphic_assets").doc(assetId).set({
      url: publicUrl,
      storagePath,
      role,
      denominationCluster,
      styleVersion: "manual_upload",
      approved: false,
      generatedAt: new Date(),
    });

    return NextResponse.json({ success: true, assetId, url: publicUrl });
  } catch (error: any) {
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message ?? "Upload failed." }, { status });
  }
}

// DELETE — remove an asset from Storage and Firestore
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    await verifySuperUser();
    const { storage: adminStorage, firestore: adminFirestore } = await import("@/firebase/admin-app");
    if (!adminStorage || !adminFirestore) {
      return NextResponse.json({ error: "Storage or Firestore unavailable." }, { status: 503 });
    }

    const { assetId, storagePath } = (await request.json()) as { assetId: string; storagePath: string };
    if (!assetId || !storagePath) {
      return NextResponse.json({ error: "assetId and storagePath are required." }, { status: 400 });
    }

    const bucket = adminStorage.bucket(STORAGE_BUCKET);
    try {
      await bucket.file(storagePath).delete();
    } catch {
      // File may already be gone from storage — still clean up Firestore
    }
    await adminFirestore.collection("graphic_assets").doc(assetId).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message ?? "Delete failed." }, { status });
  }
}

// PATCH — toggle approved flag
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    await verifySuperUser();
    const { firestore: adminFirestore } = await import("@/firebase/admin-app");
    if (!adminFirestore) {
      return NextResponse.json({ error: "Firestore unavailable." }, { status: 503 });
    }

    const { assetId, approved } = (await request.json()) as { assetId: string; approved: boolean };
    if (!assetId || approved === undefined) {
      return NextResponse.json({ error: "assetId and approved are required." }, { status: 400 });
    }

    await adminFirestore.collection("graphic_assets").doc(assetId).update({ approved });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message ?? "Update failed." }, { status });
  }
}
