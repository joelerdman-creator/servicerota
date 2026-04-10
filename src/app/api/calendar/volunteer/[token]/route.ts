import { NextRequest, NextResponse } from "next/server";
import { firestore as adminFirestore } from "@/firebase/admin-app";
import ical, { ICalCalendarMethod } from "ical-generator";

/**
 * GET /api/calendar/volunteer/[token]
 *
 * Personal iCal feed for a volunteer. Shows only their confirmed assignments.
 * Auth is by secret token stored on the user document (calendarToken field).
 *
 * Subscribe URL: webcal://yourdomain.com/api/calendar/volunteer/[token]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!adminFirestore) {
    return new NextResponse("Server not configured", { status: 500 });
  }

  try {
    // Look up the user by their calendar token
    const usersSnap = await adminFirestore
      .collection("users")
      .where("calendarToken", "==", token)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      return new NextResponse("Invalid or expired calendar link", { status: 404 });
    }

    const userDoc = usersSnap.docs[0];
    const user = userDoc.data();
    const volunteerId = userDoc.id;
    const volunteerName = `${user.firstName} ${user.lastName}`;
    const churchId: string = user.churchId;

    if (!churchId) {
      return new NextResponse("No church associated with this account", { status: 400 });
    }

    // Fetch church info for calendar name/location
    const churchDoc = await adminFirestore.collection("churches").doc(churchId).get();
    const church = churchDoc.exists ? churchDoc.data()! : {};
    const churchName: string = church.name || "Church";

    // Find all published events that have a role assigned to this volunteer
    const eventsSnap = await adminFirestore
      .collection(`churches/${churchId}/events`)
      .where("isPublished", "==", true)
      .orderBy("eventDate", "asc")
      .get();

    const calendar = ical({
      name: `${volunteerName} — My Serving Schedule`,
      description: `Your personal volunteer schedule at ${churchName}.`,
      timezone: "America/Chicago",
      method: ICalCalendarMethod.PUBLISH,
      prodId: { company: "Parish Scribe", product: "RotaScribe" },
    });

    for (const eventDoc of eventsSnap.docs) {
      const event = eventDoc.data();

      // Find roles assigned to this volunteer in this event
      const rolesSnap = await eventDoc.ref
        .collection("roles")
        .where("assignedVolunteerId", "==", volunteerId)
        .get();

      if (rolesSnap.empty) continue;

      const roleNames = rolesSnap.docs.map((r) => r.data().roleName).join(", ");
      const eventDate = new Date(event.eventDate);
      const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);

      calendar.createEvent({
        id: `${eventDoc.id}-${volunteerId}@parishscribe`,
        start: eventDate,
        end: endDate,
        summary: `${event.eventName} — ${roleNames}`,
        description: `You are serving as: ${roleNames}\nEvent: ${event.eventName}\nChurch: ${churchName}${event.notes ? `\n\nNotes: ${event.notes}` : ""}`,
        location: church.address || undefined,
      });
    }

    return new NextResponse(calendar.toString(), {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="my-serving-schedule.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Volunteer calendar feed error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
