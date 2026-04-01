"use server";

import { render } from "@react-email/render";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import * as smsTemplates from "@/lib/sms-templates";
import { AssignmentNotificationEmail } from "@/emails/assignment-notification";
import { VolunteerInvitationEmail } from "@/emails/volunteer-invitation";
import { SchedulePublishedEmail } from "@/emails/schedule-published";
import { SubstitutionRequestEmail } from "@/emails/substitution-request";
import { ApprovalConfirmationEmail } from "@/emails/approval-confirmation";
import { SubstitutionClaimedEmail } from "@/emails/substitution-claimed";
import { TradeRequestEmail } from "@/emails/trade-request";
import { TradeAcceptedEmail } from "@/emails/trade-accepted";
import { AvailabilityReminderEmail } from "@/emails/availability-reminder";
import { EventReminderEmail } from "@/emails/event-reminder";
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

/**
 * Build a plain-text SMS body from the notification input.
 * Returns null for notification types that don't need SMS.
 */
function buildSmsBody(input: SendNotificationInput): string | null {
  switch (input.type) {
    case "assignment":
      return smsTemplates.assignmentSms({
        volunteerName: input.volunteerName,
        roleName: input.roleName,
        eventName: input.eventName,
        eventDate: input.eventDate,
        churchName: input.churchName,
      });
    case "volunteer_invitation":
      return smsTemplates.volunteerInvitationSms({
        volunteerName: input.volunteerName,
        churchName: input.churchName,
        claimUrl: input.claimUrl,
      });
    case "substitution_request":
      return smsTemplates.substitutionRequestSms({
        recipientName: input.recipientName,
        requestingVolunteerName: input.requestingVolunteerName,
        roleName: input.roleName,
        eventName: input.eventName,
        eventDate: input.eventDate,
        claimUrl: input.claimUrl,
      });
    case "approval_confirmation":
      return smsTemplates.approvalConfirmationSms({
        volunteerName: input.volunteerName,
        churchName: input.churchName,
      });
    case "substitution_claimed":
      return smsTemplates.substitutionClaimedSms({
        originalVolunteerName: input.originalVolunteerName,
        claimedByName: input.claimedByName,
        roleName: input.roleName,
        eventName: input.eventName,
      });
    case "trade_request":
      return smsTemplates.tradeRequestSms({
        recipientName: input.recipientName,
        requesterName: input.requesterName,
        requesterRoleName: input.requesterRoleName,
        targetRoleName: input.targetRoleName,
        acceptUrl: input.acceptUrl,
      });
    case "trade_accepted":
      return smsTemplates.tradeAcceptedSms({
        requesterName: input.requesterName,
        acceptedByName: input.acceptedByName,
        newRoleName: input.newRoleName,
        newEventName: input.newEventName,
        newEventDate: input.newEventDate,
      });
    case "availability_reminder":
      return smsTemplates.availabilityReminderSms({
        volunteerName: input.volunteerName,
        churchName: input.churchName,
        dueDate: input.dueDate,
      });
    case "event_reminder":
      return smsTemplates.eventReminderSms({
        volunteerName: input.volunteerName,
        roleName: input.roleName,
        eventName: input.eventName,
        eventDate: input.eventDate,
        churchName: input.churchName,
      });
    default:
      return null;
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

    case "approval_confirmation":
      subject = `Welcome to ${input.churchName} on Parish Scribe!`;
      emailHtml = render(
        React.createElement(ApprovalConfirmationEmail, {
          volunteerName: input.volunteerName,
          churchName: input.churchName,
          loginUrl: input.loginUrl,
        }),
      );
      break;

    case "substitution_claimed":
      subject = `Your substitution for ${input.roleName} has been filled!`;
      emailHtml = render(
        React.createElement(SubstitutionClaimedEmail, {
          originalVolunteerName: input.originalVolunteerName,
          claimedByName: input.claimedByName,
          eventName: input.eventName,
          eventDate: format(new Date(input.eventDate), "EEEE, MMMM do, yyyy @ h:mm a"),
          roleName: input.roleName,
          churchName: input.churchName,
          loginUrl: input.loginUrl,
        }),
      );
      break;

    case "trade_request":
      subject = `${input.requesterName} wants to trade assignments with you`;
      emailHtml = render(
        React.createElement(TradeRequestEmail, {
          recipientName: input.recipientName,
          requesterName: input.requesterName,
          requesterRoleName: input.requesterRoleName,
          requesterEventName: input.requesterEventName,
          requesterEventDate: format(new Date(input.requesterEventDate), "EEEE, MMMM do, yyyy @ h:mm a"),
          targetRoleName: input.targetRoleName,
          targetEventName: input.targetEventName,
          targetEventDate: format(new Date(input.targetEventDate), "EEEE, MMMM do, yyyy @ h:mm a"),
          churchName: input.churchName,
          acceptUrl: input.acceptUrl,
        }),
      );
      break;

    case "trade_accepted":
      subject = `Trade accepted! Your schedule has been updated`;
      emailHtml = render(
        React.createElement(TradeAcceptedEmail, {
          requesterName: input.requesterName,
          acceptedByName: input.acceptedByName,
          newRoleName: input.newRoleName,
          newEventName: input.newEventName,
          newEventDate: format(new Date(input.newEventDate), "EEEE, MMMM do, yyyy @ h:mm a"),
          churchName: input.churchName,
          loginUrl: input.loginUrl,
        }),
      );
      break;

    case "availability_reminder":
      subject = `Reminder: Submit your availability for ${input.churchName} by ${input.dueDate}`;
      emailHtml = render(
        React.createElement(AvailabilityReminderEmail, {
          volunteerName: input.volunteerName,
          churchName: input.churchName,
          dueDate: input.dueDate,
          loginUrl: loginUrl,
        }),
      );
      break;

    case "event_reminder":
      subject = `Reminder: You're serving at ${input.eventName}`;
      emailHtml = render(
        React.createElement(EventReminderEmail, {
          volunteerName: input.volunteerName,
          eventName: input.eventName,
          eventDate: format(new Date(input.eventDate), "EEEE, MMMM do, yyyy 'at' h:mm a"),
          roleName: input.roleName,
          churchName: input.churchName,
          loginUrl: loginUrl,
        }),
      );
      break;

    default:
      const unknownInput: any = input;
      console.error("Unknown notification type:", unknownInput.type);
      throw new Error("Unknown notification type.");
  }

  // 1. Send email
  const result = await sendEmail({
    to: [input.toEmail],
    subject,
    html: emailHtml,
  });

  // 2. Send SMS (fire-and-forget) if volunteer opted in
  if (input.smsOptIn && input.toPhone) {
    const smsBody = buildSmsBody(input);
    if (smsBody) {
      void sendSms({ to: input.toPhone, body: smsBody }).catch((err) =>
        console.error("SMS send failed:", err),
      );
    }
  }

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

  // Send SMS if volunteer opted in
  if (input.smsOptIn && input.toPhone) {
    const smsBody = smsTemplates.schedulePublishedSms({
      recipientName: input.recipientName,
      churchName: input.churchName,
      assignmentCount: input.assignments.length,
    });
    void sendSms({ to: input.toPhone, body: smsBody }).catch((err) =>
      console.error("SMS send failed:", err),
    );
  }

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
