
import { genkit, type Genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
export const ai: Genkit = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || "AIzaSyCPu0-4p5EIZoPeHlgzsnasUwcr0Fq5SrM",
    }),
  ],
});
