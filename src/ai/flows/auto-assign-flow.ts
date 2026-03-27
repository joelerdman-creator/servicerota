
"use server";

import { ai } from "@/ai/genkit";
import {
  AutoAssignInputSchema,
  AssignmentPlanSchema,
  type AutoAssignInput,
} from "@/lib/scheduling/types";
import { deterministicAutoAssign } from "@/lib/scheduling/auto-assign";

// The Genkit flow is now just a wrapper that could be used for other purposes,
// but our app directly calls the deterministic function. We keep the flow definition
// in case we want to expose it via Genkit's developer UI in the future.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const autoAssignFlow = ai.defineFlow(
  {
    name: "autoAssignFlow",
    inputSchema: AutoAssignInputSchema,
    outputSchema: AssignmentPlanSchema,
  },
  (input: AutoAssignInput) => {
    return deterministicAutoAssign(input);
  },
);
