import { NextRequest, NextResponse } from "next/server";
import { extractDataFromEml } from "@/ai/flows/extract-from-eml-flow";

/**
 * POST /api/extract/eml
 * Wraps the EML server action as a proper API route so errors
 * are returned as JSON rather than crashing as a Server Component.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentDataUri, knownRoleNames } = body;
    if (!documentDataUri) {
      return NextResponse.json({ error: "documentDataUri is required" }, { status: 400 });
    }
    const result = await extractDataFromEml({ documentDataUri, knownRoleNames: knownRoleNames || [] });
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[/api/extract/eml]", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
