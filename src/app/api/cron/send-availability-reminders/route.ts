import { NextRequest, NextResponse } from "next/server";
import { firestore as adminFirestore } from "@/firebase/admin-app";
import { sendNotificationAction } from "@/ai/flows/actions";
import { format, getDate, getMonth } from "date-fns";

// Quarterly reminder months: January (0), April (3), July (6), October (9)
const QUARTERLY_MONTHS = [0, 3, 6, 9];

/**
 * POST /api/cron/send-availability-reminders
 *
 * Run daily. For each church with availabilityReminder.enabled, checks whether
 * today is exactly daysBeforeReminder days before the upcoming due date. If so,
 * sends an availability_reminder email (+SMS if opted in) to every active volunteer.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET_KEY ||
    authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!adminFirestore) {
    return NextResponse.json({ error: "Server Firestore not configured" }, { status: 500 });
  }

  const today = new Date();
  const todayDayOfMonth = getDate(today);
  const todayMonth = getMonth(today); // 0-indexed

  let remindersSent = 0;
  let churchesProcessed = 0;

  try {
    const churchesSnap = await adminFirestore.collection("churches").get();

    for (const churchDoc of churchesSnap.docs) {
      const church = churchDoc.data();
      const ar = church.availabilityReminder;

      if (!ar?.enabled) continue;

      const { recurrence, dayOfMonth, daysBeforeReminder } = ar as {
        recurrence: "monthly" | "quarterly";
        dayOfMonth: number;
        daysBeforeReminder: number;
      };

      // Determine if today is the trigger day (dayOfMonth - daysBeforeReminder)
      const triggerDay = dayOfMonth - daysBeforeReminder;
      if (triggerDay < 1) continue; // misconfigured — skip

      // For quarterly: only trigger in the qualifying months
      if (recurrence === "quarterly" && !QUARTERLY_MONTHS.includes(todayMonth)) continue;

      if (todayDayOfMonth !== triggerDay) continue;

      churchesProcessed++;

      // Calculate the human-readable due date for this period
      const dueDate = new Date(today.getFullYear(), todayMonth, dayOfMonth);
      const dueDateString = format(dueDate, "MMMM d, yyyy");
      const churchName = church.name || "your church";
      const churchId = churchDoc.id;
      const loginUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000/dashboard";

      // Fetch all active volunteers for this church
      const volunteersSnap = await adminFirestore
        .collection("users")
        .where("churchId", "==", churchId)
        .where("status", "==", "active")
        .where("role", "==", "volunteer")
        .get();

      for (const volunteerDoc of volunteersSnap.docs) {
        const v = volunteerDoc.data();
        if (!v.email) continue;

        try {
          await sendNotificationAction({
            type: "availability_reminder",
            toEmail: v.email,
            toPhone: v.phone,
            smsOptIn: v.smsOptIn,
            volunteerName: `${v.firstName} ${v.lastName}`,
            churchName,
            dueDate: dueDateString,
            loginUrl,
            churchId,
          });
          remindersSent++;
        } catch (err) {
          console.error(`Failed to send availability reminder to ${v.email}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${churchesProcessed} church(es). Sent ${remindersSent} reminder(s).`,
    });
  } catch (error: any) {
    console.error("send-availability-reminders cron failed:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
