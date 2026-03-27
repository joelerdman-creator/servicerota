"use server";

import { ai } from "@/ai/genkit";
import { sendNotificationAction, sendScheduleNotificationAction } from "./actions";
import {
  SendNotificationInputSchema,
  SendNotificationOutputSchema,
  SendScheduleNotificationInputSchema,
  type SendNotificationInput,
  type SendNotificationOutput,
  type SendScheduleNotificationInput,
} from "./types";

export async function sendNotification(
  input: SendNotificationInput,
): Promise<SendNotificationOutput> {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return sendNotificationFlow(input);
}

const sendNotificationFlow = ai.defineFlow(
  {
    name: "sendNotificationFlow",
    inputSchema: SendNotificationInputSchema,
    outputSchema: SendNotificationOutputSchema,
  },
  async (input) => {
    return await sendNotificationAction(input);
  },
);

export async function sendScheduleNotification(
  input: SendScheduleNotificationInput,
): Promise<SendNotificationOutput> {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return sendScheduleNotificationFlow(input);
}

const sendScheduleNotificationFlow = ai.defineFlow(
  {
    name: "sendScheduleNotificationFlow",
    inputSchema: SendScheduleNotificationInputSchema,
    outputSchema: SendNotificationOutputSchema,
  },
  async (input) => {
    return await sendScheduleNotificationAction(input);
  },
);
