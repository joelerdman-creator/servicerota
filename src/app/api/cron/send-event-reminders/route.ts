import { NextRequest, NextResponse } from "next/server";
import { firestore as adminFirestore } from "@/firebase/admin-app";
import { sendNotificationAction } from "@/ai/flows/actions";
import { addDays, startOfDay, format } from "date-fns";

/**
 * POST /api/cron/send-event-reminders
 *
 * Run daily. For each church with eventReminderDays configured, finds all
 * published events whose date falls exactly X days from today (where X is one
 * of the configured reminder days). Sends an event_reminder to each assigned
 * volunteer, respecting their personal reminder preferences if set.
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

  const today = startOfDay(new Date());
  let remindersSent = 0;
  let churchesProcessed = 0;

  try {
    const churchesSnap = await adminFirestore.collection("churches").get();

    for (const churchDoc of churchesSnap.docs) {
      const church = churchDoc.data();
      const churchReminderDays: number[] = church.eventReminderDays ?? [];
      if (churchReminderDays.length === 0) continue;

      churchesProcessed++;
      const churchId = churchDoc.id;
      const churchName = church.name || "your church";
      const loginUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000/dashboard";

      // Fetch all volunteers for this church for quick lookup
      const volunteersSnap = await adminFirestore
        .collection("users")
        .where("churchId", "==", churchId)
        .where("status", "==", "active")
        .get();

      const volunteerMap = new Map<string, FirebaseFirestore.DocumentData>();
      volunteersSnap.docs.forEach((d) => volunteerMap.set(d.id, d.data()));

      // Check each reminder day: find events that are exactly N days away
      const uniqueReminderDays = [...new Set(churchReminderDays)];

      for (const daysAway of uniqueReminderDays) {
        const targetDate = startOfDay(addDays(today, daysAway));
        const targetDateISO = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD prefix

        const eventsSnap = await adminFirestore
          .collection(`churches/${churchId}/events`)
          .where("isPublished", "==", true)
          .get();

        for (const eventDoc of eventsSnap.docs) {
          const event = eventDoc.data();
          const eventDateStr = new Date(event.eventDate).toISOString().split("T")[0];
          if (eventDateStr !== targetDateISO) continue;

          // Get all confirmed roles for this event
          const rolesSnap = await eventDoc.ref
            .collection("roles")
            .where("status", "==", "Confirmed")
            .get();

          for (const roleDoc of rolesSnap.docs) {
            const role = roleDoc.data();
            if (!role.assignedVolunteerId) continue;

            const volunteer = volunteerMap.get(role.assignedVolunteerId);
            if (!volunteer?.email) continue;

            // Respect volunteer's personal reminder preferences if they have any
            const volunteerReminderDays: number[] = volunteer.eventReminderDays ?? [];
            const effectiveDays =
              volunteerReminderDays.length > 0 ? volunteerReminderDays : churchReminderDays;

            // Only send if this daysAway value is in the volunteer's effective reminder days
            if (!effectiveDays.includes(daysAway)) continue;

            try {
              await sendNotificationAction({
                type: "event_reminder",
                toEmail: volunteer.email,
                toPhone: volunteer.phone,
                smsOptIn: volunteer.smsOptIn,
                volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
                eventName: event.eventName,
                eventDate: event.eventDate,
                roleName: role.roleName,
                churchName,
                loginUrl,
                churchId,
              });
              remindersSent++;
            } catch (err) {
              console.error(`Failed to send event reminder to ${volunteer.email}:`, err);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${churchesProcessed} church(es). Sent ${remindersSent} event reminder(s).`,
    });
  } catch (error: any) {
    console.error("send-event-reminders cron failed:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
