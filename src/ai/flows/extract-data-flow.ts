
"use server";

import { ai } from "@/ai/genkit";
import {
  ExtractDataInputSchema,
  ExtractDataOutputSchema,
  type ExtractDataInput,
  type ExtractDataOutput,
} from "./types";

// The main exported function that calls the flow
export async function extractDataFromText(input: ExtractDataInput): Promise<ExtractDataOutput> {
  try {
    const result = await extractDataFlow(input);
    return JSON.parse(JSON.stringify(result));
  } catch (e: any) {
    console.error("AI Extraction Error (Text):", e);
    // Re-throw a clean error to be caught by the client
    throw new Error(e.message || JSON.stringify(e));
  }
}

// Genkit Flow Definition
const extractDataFlow = ai.defineFlow(
  {
    name: "extractDataFlow",
    inputSchema: ExtractDataInputSchema,
    outputSchema: ExtractDataOutputSchema,
  },
  async (input) => {
    let targetData: string;

    switch (input.dataType) {
        case 'volunteers':
            targetData = "a list of volunteers, including their first name, last name, and email address (if available).";
            break;
        case 'roles':
            targetData = "a list of volunteer roles (e.g., Lector, Usher, Acolyte).";
            break;
        case 'volunteers-and-roles':
            targetData = "a list of volunteers (first name, last name, email) AND a list of volunteer roles (e.g., Lector, Usher).";
            break;
        default:
            targetData = "any relevant data.";
    }


    const prompt = `
You are an intelligent data extraction assistant. Your task is to analyze a block of unstructured text and extract structured data from it.

The user has indicated they are trying to extract **${targetData}**.

The text to analyze is:
"""
${input.pastedText}
"""

**Instructions:**
1.  Read the text carefully. It could be from a spreadsheet, a document, or just a simple list.
2.  Identify and extract ${targetData}.
3.  Be robust to messy formatting, extra whitespace, and irrelevant text. Ignore any lines that don't seem to fit the requested data type.
4.  For volunteers, if a line has a name but no email, extract the name and omit the email field. If a line is just an email, try to infer the name if possible or skip it.
5.  For roles, extract each distinct role. Ignore any numbers or extra text associated with them.
6.  Provide a brief "reasoning" summary explaining what you found and how you interpreted the data. For example, "I found 15 people and 3 email addresses in the text provided." or "I found 5 unique roles in the list."
7.  If you cannot find any relevant data, return empty arrays for the data and explain why in the reasoning field.
`;

    const { output } = await ai.generate({
      prompt,
      model: "googleai/gemini-2.5-flash-lite",
      output: {
        schema: ExtractDataOutputSchema,
      },
      config: {
        temperature: 0.1, // Low temperature for factual extraction
        safetySettings: [
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
        ],
      },
    });

    if (!output) {
      throw new Error("The AI model did not return a valid extraction plan.");
    }

    return output;
  },
);
