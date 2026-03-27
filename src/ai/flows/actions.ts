"use server";

import { render } from "@react-email/render";
import { sendEmail } from "@/lib/email";
import { AssignmentNotificationEmail } from "@/emails/assignment-notification";
import { VolunteerInvitationEmail } from "@/emails/volunteer-invitation";
import { SchedulePublishedEmail } from "@/emails/schedule-published";
import { SubstitutionRequestEmail } from "@/emails/substitution-request";
import { format } from "date-fns";
import type { SendNotificationInput, SendScheduleNotificationInput } from "./types";
import React from "react";

function logNotification(
  churchId: string,
  toEmail: string,
  subject: string,
  html: string,
  type: string,
  result: { success: boolean; error?: any },
): void {
  // This action now calls an API route to handle logging, ensuring
  // the Firebase Admin SDK is not bundled with client-side code.
  try {
    const logPayload = {
      churchId,
      recipientEmail: toEmail,
      subject,
      emailContent: html,
      sentAt: new Date().toISOString(),
      status: result.success ? "Sent" : "Failed",
      errorMessage: result.error ? JSON.stringify(result.error) : null,
      type: type,
    };

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    // We don't need to wait for this to complete. Fire and forget.
    void fetch(`${baseUrl}/api/log-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add a secret header to secure the endpoint
        "X-Internal-Secret": process.env.INTERNAL_SECRET_KEY || "",
      },
      body: JSON.stringify(logPayload),
    });
  } catch (logError) {
    console.error("FATAL: Could not call notification log API.", logError);
  }
}

export async function sendNotificationAction(
  input: SendNotificationInput,
): Promise<{ success: boolean; message: string }> {
  let subject = "";
  let emailHtml = "";

  const loginUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000/dashboard";

  switch (input.type) {
    case "assignment":
      subject = `New Assignment: ${input.roleName} for ${input.eventName}`;
      emailHtml = render(
        React.createElement(AssignmentNotificationEmail, {
          volunteerName: input.volunteerName,
          eventName: input.eventName,
          eventDate: format(new Date(input.eventDate), "EEEE, MMMM do, yyyy @ h:mm a"),
          roleName: input.roleName,
          churchName: input.churchName,
          loginUrl: loginUrl,
        }),
      );
      break;

    case "volunteer_invitation":
      subject = `You're invited to join ${input.churchName} on Parish Scribe`;
      emailHtml = render(
        React.createElement(VolunteerInvitationEmail, {
          volunteerName: input.volunteerName,
          churchName: input.churchName,
          adminName: input.adminName,
          claimUrl: input.claimUrl,
        }),
      );
      break;

    case "substitution_request":
      subject = `Substitution Needed: ${input.roleName} for ${input.eventName}`;
      emailHtml = render(
        React.createElement(SubstitutionRequestEmail, {
          recipientName: input.recipientName,
          requestingVolunteerName: input.requestingVolunteerName,
          eventName: input.eventName,
          eventDate: format(new Date(input.eventDate), "EEEE, MMMM do, yyyy @ h:mm a"),
          roleName: input.roleName,
          churchName: input.churchName,
          claimUrl: input.claimUrl,
        }),
      );
      break;

    default:
      const unknownInput: any = input;
      console.error("Unknown notification type:", unknownInput.type);
      throw new Error("Unknown notification type.");
  }

  const result = await sendEmail({
    to: [input.toEmail],
    subject,
    html: emailHtml,
  });

  if ("churchId" in input && input.churchId) {
    logNotification(input.churchId, input.toEmail, subject, emailHtml, input.type, result);
  }

  if (result.success) {
    return { success: true, message: `Email sent to ${input.toEmail}` };
  } else {
    return {
      success: false,
      message: `Failed to send email. Reason: ${String(result.error)}`,
    };
  }
}

export async function sendScheduleNotificationAction(
  input: SendScheduleNotificationInput,
): Promise<{ success: boolean; message: string }> {
  const loginUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000/dashboard";

  const subject = `Schedule Published for ${input.eventName}`;
  const emailHtml = render(
    React.createElement(SchedulePublishedEmail, {
      recipientName: input.recipientName,
      churchName: input.churchName,
      assignments: input.assignments.map((a) => ({
        ...a,
        eventDate: format(new Date(a.eventDate), "EEEE, MMMM do"),
      })),
      loginUrl,
    }),
  );

  const result = await sendEmail({
    to: [input.toEmail],
    subject,
    html: emailHtml,
  });

  if (input.churchId) {
    logNotification(
      input.churchId,
      input.toEmail,
      subject,
      emailHtml,
      "schedule_published",
      result,
    );
  }

  if (result.success) {
    return {
      success: true,
      message: `Schedule notification sent to ${input.toEmail}`,
    };
  } else {
    return {
      success: false,
      message: `Failed to send email. Reason: ${String(result.error)}`,
    };
  }
}
