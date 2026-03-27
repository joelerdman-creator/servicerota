"use server";

import { sendNotification } from "@/ai/flows/send-notification-flow";
import { SendNotificationInput } from "@/ai/flows/types";

export async function sendVolunteerInvite(input: SendNotificationInput) {
  return await sendNotification(input);
}
