
import { ai } from "./src/ai/genkit";
import { DocumentExtractionOutputSchema } from "./src/ai/flows/types";

async function test() {
  try {
    console.log("Testing Genkit with gemini-pro...");
    const { output } = await ai.generate({
      prompt: "Hello, just return empty lists and a greeting in reasoning.",
      model: "googleai/gemini-pro",
      output: { schema: DocumentExtractionOutputSchema },
    });
    console.log("Success:", output);
  } catch (e) {
    console.error("Failure:", e);
  }
}

test();
