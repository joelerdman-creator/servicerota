
"use server";

import { ai } from "@/ai/genkit";
import { simpleParser } from "mailparser";
import {
  DocumentExtractionInputSchema,
  type DocumentExtractionInput,
  DocumentExtractionOutputSchema,
  type DocumentExtractionOutput,
} from "./types";

// This is a dedicated flow for handling .eml files.
export async function extractDataFromEml(
  input: DocumentExtractionInput,
): Promise<DocumentExtractionOutput> {
  try {
    const result = await extractFromEmlFlow(input);
    return JSON.parse(JSON.stringify(result));
  } catch (e: any) {
    console.error("AI Extraction Error (EML):", e);
    // Re-throw a clean error to be caught by the client
    throw new Error(e.message || JSON.stringify(e));
  }
}

const extractFromEmlFlow = ai.defineFlow(
  {
    name: "extractFromEmlFlow",
    inputSchema: DocumentExtractionInputSchema,
    outputSchema: DocumentExtractionOutputSchema,
  },
  async (input) => {
    const textPromptTemplate = `
You are an intelligent data extraction assistant for a church volunteer management application called Parish Scribe.
Your task is to analyze the provided document content, which is from an email, and extract structured data from it.

The first part of the text contains the 'To' and 'Cc' fields of the email. Pay close attention to these for finding volunteer names and email addresses.

**Known Roles:**
Here is a list of roles that might be in the document: {{knownRoleNames}}. Use this list to help you identify roles. You can also find new roles not on this list.

**Your Goal:**
Extract as much of the following information as you can find:
1.  **Events:** Service names, dates, and times (e.g., "Sunday Morning Eucharist - 10:00 AM, Oct 27, 2024").
2.  **Volunteers:** People's names. CRITICALLY, you MUST extract their email address if it is present in the email body or headers (To, Cc).
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
      console.log("Parsing EML file content on server.");
      const base64Data = input.documentDataUri.split(";base64,")[1];
      if (!base64Data) {
        throw new Error("Invalid Data URI for EML file.");
      }
      const emailBuffer = Buffer.from(base64Data, "base64");
      const parsedEmail = await simpleParser(emailBuffer);

      // Prepend To and Cc fields to the content for the AI to analyze.
      let combinedContent = "";
      if (parsedEmail.to) {
        const toText = Array.isArray(parsedEmail.to) ? parsedEmail.to.map(t => t.text).join(', ') : parsedEmail.to.text;
        combinedContent += `To: ${toText}\n`;
      }
      if (parsedEmail.cc) {
        const ccText = Array.isArray(parsedEmail.cc) ? parsedEmail.cc.map(c => c.text).join(', ') : parsedEmail.cc.text;
        combinedContent += `Cc: ${ccText}\n\n`;
      }
      
      // Prioritize HTML content for better structure, fallback to plain text.
      const documentContent = parsedEmail.html || parsedEmail.text || "No text content found in email.";
      combinedContent += documentContent;

      const finalPrompt = textPromptTemplate.replace(
        "{{knownRoleNames}}",
        input.knownRoleNames?.join(", ") || "No known roles provided, find them from the document.",
      );
      
      const { output } = await ai.generate({
        prompt: `${finalPrompt}\n\n**Document Content:**\n\n${combinedContent}`,
        model: "googleai/gemini-2.5-flash-lite",
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
        throw new Error("AI model did not return a valid response after parsing EML.");
      }
      return output;

    } catch (error) {
      console.error("Failed to process EML file:", error);
      throw new Error(`Failed to parse or analyze the .eml file. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);
