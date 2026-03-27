import { NextRequest, NextResponse } from "next/server";
import ical from "node-ical";
import type { ParsedEvent } from "@/ai/flows/types";
import { rrulestr } from "rrule";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!url) {
    return NextResponse.json({ message: "Missing calendar URL." }, { status: 400 });
  }

  try {
    const events = await ical.fromURL(url);
    const parsedEvents: ParsedEvent[] = [];

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    for (const key in events) {
      if (Object.prototype.hasOwnProperty.call(events, key)) {
        const event = events[key];
        if (event?.type === "VEVENT" && event.summary && event.start) {
          const eventStart = new Date(event.start);
          if (event.rrule) {
            const rule = rrulestr(event.rrule.toString(), { dtstart: eventStart });
            // Set a sane limit for recurring events
            const allOccurrences = rule.between(
              fromDate || new Date(),
              toDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
              true,
            );

            for (const occurrence of allOccurrences) {
              if (!isNaN(occurrence.getTime())) {
                parsedEvents.push({
                  eventName: event.summary,
                  eventDate: occurrence.toISOString(),
                  notes: event.description || "",
                });
              }
            }
          } else {
            // Non-recurring event
            if (fromDate && eventStart < fromDate) continue;
            if (toDate && eventStart > toDate) continue;

            if (!isNaN(eventStart.getTime())) {
              parsedEvents.push({
                eventName: event.summary,
                eventDate: eventStart.toISOString(),
                notes: event.description || "",
              });
            }
          }
        }
      }
    }

    // Final filter to ensure all events are within the range if specified
    const finalEvents = parsedEvents
      .filter((p) => {
        const eventDate = new Date(p.eventDate);
        if (fromDate && eventDate < fromDate) return false;
        if (toDate && eventDate > toDate) return false;
        return true;
      })
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

    if (finalEvents.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No upcoming events found at the provided URL for the selected range.",
          events: [],
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Found ${finalEvents.length} events.`,
        events: finalEvents,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    console.error("ICS URL Import Server Error:", err);
    return NextResponse.json(
      {
        message:
          (err as Error).message || "Failed to import from URL. Check the link and try again.",
      },
      { status: 500 },
    );
  }
}
