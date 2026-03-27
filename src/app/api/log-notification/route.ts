
import { NextResponse, NextRequest } from "next/server";
import type { Firestore, FieldValue } from "firebase-admin/firestore";

interface NotificationLog {
  churchId: string;
  [key: string]: unknown;
}

async function logNotificationToDb(
  adminFirestore: Firestore,
  notificationData: NotificationLog,
): Promise<void> {
  try {
    const { churchId, ...restOfData } = notificationData;
    if (!churchId) {
      throw new Error("churchId is required to log a notification.");
    }

    // Dynamically get FieldValue
    const { FieldValue } = await import("firebase-admin/firestore");

    const notificationsCol = adminFirestore.collection(`churches/${churchId}/notifications`);
    await notificationsCol.add({
      ...restOfData,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (logError) {
    console.error("FATAL: Could not write notification log to Firestore.", logError);
    throw logError;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const internalSecret = request.headers.get("X-Internal-Secret");
  const expectedSecret = process.env.INTERNAL_SECRET_KEY;

  if (!expectedSecret || internalSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // --- Dynamic Import of Admin SDK ---
    const { firestore: adminFirestore } = await import("@/firebase/admin-app");

    if (!adminFirestore) {
      console.error(
        "log-notification: Firestore admin instance not available. Check server environment variables.",
      );
      return NextResponse.json(
        { error: "The logging service is not configured on the server." },
        { status: 503 },
      );
    }
    // --- End Dynamic Import ---

    const notificationData = (await request.json()) as NotificationLog;
    await logNotificationToDb(adminFirestore, notificationData);

    return NextResponse.json({ success: true, message: "Notification logged." }, { status: 200 });
  } catch (error: unknown) {
    console.error("API Error logging notification:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      { error: "Failed to log notification", details: message },
      { status: 500 },
    );
  }
}
