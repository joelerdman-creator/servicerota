import { NextRequest, NextResponse } from "next/server";
import { extractDataFromDocument } from "@/ai/flows/extract-from-document-flow";

/**
 * POST /api/extract/document
 * Wraps the document extraction server action as a proper API route.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentDataUri, knownRoleNames } = body;
    if (!documentDataUri) {
      return NextResponse.json({ error: "documentDataUri is required" }, { status: 400 });
    }
    const result = await extractDataFromDocument({ documentDataUri, knownRoleNames: knownRoleNames || [] });
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[/api/extract/document]", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
