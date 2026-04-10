import { NextRequest, NextResponse } from "next/server";
import { firestore as adminFirestore } from "@/firebase/admin-app";
import ical, { ICalCalendarMethod } from "ical-generator";
import { format } from "date-fns";

/**
 * GET /api/calendar/church/[churchId]
 *
 * Public iCal feed of all published events for a church.
 * Each event description includes the full role roster with assigned volunteer
 * names (or "(Open)" for unfilled roles).
 *
 * Subscribe URL: webcal://yourdomain.com/api/calendar/church/[churchId]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;

  if (!adminFirestore) {
    return new NextResponse("Server not configured", { status: 500 });
  }

  try {
    // Fetch church info
    const churchDoc = await adminFirestore.collection("churches").doc(churchId).get();
    if (!churchDoc.exists) {
      return new NextResponse("Church not found", { status: 404 });
    }
    const church = churchDoc.data()!;
    const churchName: string = church.name || "Church";

    // Fetch all published events
    const eventsSnap = await adminFirestore
      .collection(`churches/${churchId}/events`)
      .where("isPublished", "==", true)
      .orderBy("eventDate", "asc")
      .get();

    const calendar = ical({
      name: `${churchName} — Full Schedule`,
      description: `Complete volunteer schedule for ${churchName}. Includes all roles and assignments.`,
      timezone: "America/Chicago",
      method: ICalCalendarMethod.PUBLISH,
      prodId: { company: "Parish Scribe", product: "RotaScribe" },
    });

    for (const eventDoc of eventsSnap.docs) {
      const event = eventDoc.data();
      const eventDate = new Date(event.eventDate);

      // Fetch all roles for this event
      const rolesSnap = await eventDoc.ref.collection("roles").orderBy("roleName").get();

      // Build description: one line per role
      let description = "";
      if (rolesSnap.empty) {
        description = "No roles assigned.";
      } else {
        const lines = rolesSnap.docs.map((roleDoc) => {
          const role = roleDoc.data();
          const assignee = role.assignedVolunteerName || "(Open)";
          const status =
            role.status === "Pending Substitution" ? " ⚠ Sub needed" : "";
          return `${role.roleName}: ${assignee}${status}`;
        });
        description = lines.join("\n");
      }

      // End time: 1 hour after start by default
      const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);

      calendar.createEvent({
        id: `${eventDoc.id}@parishscribe`,
        start: eventDate,
        end: endDate,
        summary: event.eventName,
        description,
        location: church.address || undefined,
      });
    }

    return new NextResponse(calendar.toString(), {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${churchName.replace(/\s+/g, "-")}-schedule.ics"`,
        // Allow calendar apps to refresh periodically
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Church calendar feed error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
