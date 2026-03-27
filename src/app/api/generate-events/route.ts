import { NextRequest, NextResponse } from "next/server";
import { RRule } from "rrule";
import type { Frequency } from "rrule";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { startDate, endDate, freq, byweekday } = (await request.json()) as {
      startDate: string;
      endDate: string;
      freq: keyof typeof RRule;
      byweekday: number | number[];
    };

    if (!startDate || !endDate || !freq) {
      return NextResponse.json(
        { message: "Missing required parameters: startDate, endDate, freq." },
        { status: 400 },
      );
    }

    // Cast to any to avoid TypeScript complaints about the RRule static property access
    const rruleFreq = RRule[freq] as Frequency;

    const rule = new RRule({
      freq: rruleFreq,
      dtstart: new Date(startDate),
      until: new Date(endDate),
      byweekday: byweekday, // Will be undefined if not provided, which is fine
    });

    const allOccurrences = rule.all().map((date) => date.toISOString());

    return NextResponse.json(allOccurrences);
  } catch (error: any) {
    console.error("Error generating recurring events:", error);
    return NextResponse.json(
      { message: (error as Error).message || "Failed to generate events." },
      { status: 500 },
    );
  }
}
