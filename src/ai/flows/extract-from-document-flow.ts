
"use server";

import { ai } from "@/ai/genkit";
import {
  DocumentExtractionInputSchema,
  type DocumentExtractionInput,
  DocumentExtractionOutputSchema,
  type DocumentExtractionOutput,
} from "./types";

// The main exported function that calls the flow
export async function extractDataFromDocument(
  input: DocumentExtractionInput,
): Promise<DocumentExtractionOutput> {
  try {
    const result = await extractFromDocumentFlow(input);
    return JSON.parse(JSON.stringify(result));
  } catch (e: any) {
    console.error("AI Extraction Error (Document):", e);
    const friendlyMessage = e.message.includes("JSON")
      ? "The AI failed to return data in the correct format. Please try a different file or simplify the content."
      : e.message;
    // Re-throw a clean error to be caught by the client
    throw new Error(friendlyMessage || JSON.stringify(e));
  }
}

// Genkit Flow Definition
const extractFromDocumentFlow = ai.defineFlow(
  {
    name: "extractFromDocumentFlow",
    inputSchema: DocumentExtractionInputSchema,
    outputSchema: DocumentExtractionOutputSchema,
  },
  async (input) => {
    const textPromptTemplate = `
You are an intelligent data extraction assistant for a church volunteer management application called Parish Scribe.
Your task is to analyze the provided document (PDF, image, etc.) and extract structured data from it based on the user's specific goal. The document could be an export from another scheduling tool like Planning Center, Ministry Scheduler Pro, or a simple spreadsheet.

**User's Goal:** ${input.userHint || "Extract all relevant scheduling data."}

**Known Roles:**
Here is a list of roles that might be in the document: {{knownRoleNames}}. Use this list to help you identify roles. You can also find new roles not on this list.

**Your Goal:**
Extract as much of the following information as you can find:
1.  **Events:** Service names, dates, and times (e.g., "Sunday Morning Eucharist - 10:00 AM, Oct 27, 2024").
2.  **Volunteers:** People's names. CRITICALLY, you MUST extract their email address if it is present near their name.
3.  **Roles:** The names of the volunteer positions (e.g., "Lector", "Acolyte", "Usher").
4.  **Service Templates:** A named group of roles. Look for a main heading (like "Sunday Eucharist" or "Weekday Mass") followed by a list of roles. For each role in the template, you MUST determine the quantity needed. If a number is in parentheses like "Acolyte (2)", the quantity is that number. If no number is present, the quantity is 1.
5.  **Role Assignments:** When you see a volunteer assigned to a role (e.g., a table with "Lector: John Doe"), you MUST associate that role with that volunteer in your output. Modify the volunteer object to include the role name in a new "inferredRoleNames" array. If you find "John Doe" assigned as "Lector", the output for John Doe should look like: \`{"firstName": "John", "lastName": "Doe", "inferredRoleNames": ["Lector"]}\`.

**Instructions:**
- Analyze the document to identify these data types.
- Consolidate and deduplicate the lists.
- For dates, parse them into ISO 8601 format. Assume the current year if not specified.
- Provide a brief "reasoning" summary explaining what you found.
`;

    try {
      const prompt = [
        {
          text: textPromptTemplate.replace(
            "{{knownRoleNames}}",
            input.knownRoleNames?.join(", ") || "No known roles provided, find them from the document.",
          ),
        },
        { media: { url: input.documentDataUri } },
      ];

      console.log(`Attempting extraction for data URI...`);

      const { output } = await ai.generate({
        prompt,
        model: "googleai/gemini-2.5-flash",
        output: { schema: DocumentExtractionOutputSchema },
        config: {
          temperature: 0.1,
          safetySettings: [
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          ],
        },
      });

      if (!output) {
        throw new Error("The AI model did not return a valid extraction plan.");
      }

      console.log(`Successfully extracted data from document.`);
      return output;
    } catch (error: any) {
      const raw = error instanceof Error ? error.message : String(error);
      console.error(`Document extraction failed:`, raw);
      // Genkit validation errors include the full schema JSON — don't expose that to the user
      const clean = raw.length > 300 || raw.includes('"$schema"') || raw.includes('"additionalProperties"')
        ? "The AI could not extract structured data from this file. Try a different file or format."
        : raw;
      throw new Error(clean);
    }
  },
);
