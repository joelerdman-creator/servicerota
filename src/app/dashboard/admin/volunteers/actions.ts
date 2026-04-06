"use server";

import { render } from "@react-email/render";
import { sendNotification } from "@/ai/flows/send-notification-flow";
import { SendNotificationInput } from "@/ai/flows/types";
import { sendEmail } from "@/lib/email";
import { RoleRequestSubmittedEmail } from "@/emails/role-request-submitted";
import { RoleRequestApprovedEmail } from "@/emails/role-request-approved";
import { RoleRequestRejectedEmail } from "@/emails/role-request-rejected";
import React from "react";

export async function sendVolunteerInvite(input: SendNotificationInput) {
  return await sendNotification(input);
}

interface RoleRequestSubmittedParams {
  adminEmails: string[]; // all admin emails — sent as `to`
  adminNames: string[];  // used for personalised greeting
  volunteerName: string;
  roleName: string;
  churchName: string;
  message?: string;
  dashboardUrl: string;
}

export async function sendRoleRequestSubmittedNotification(params: RoleRequestSubmittedParams) {
  const { adminEmails, adminNames, volunteerName, roleName, churchName, message, dashboardUrl } = params;
  if (adminEmails.length === 0) return;

  // Send one email to all admins (first admin name as greeting, others see it too)
  const adminName = adminNames.length === 1 ? adminNames[0] : "Admin Team";
  const html = render(
    React.createElement(RoleRequestSubmittedEmail, {
      adminName,
      volunteerName,
      roleName,
      churchName,
      message,
      dashboardUrl,
    }),
  );
  await sendEmail({
    to: adminEmails,
    subject: `Role Request: ${volunteerName} wants to serve as ${roleName}`,
    html,
  });
}

interface RoleRequestApprovedParams {
  volunteerEmail: string;
  volunteerName: string;
  roleName: string;
  churchName: string;
  loginUrl: string;
  adminBccEmails: string[];
}

export async function sendRoleRequestApprovedNotification(params: RoleRequestApprovedParams) {
  const { volunteerEmail, volunteerName, roleName, churchName, loginUrl, adminBccEmails } = params;
  const html = render(
    React.createElement(RoleRequestApprovedEmail, { volunteerName, roleName, churchName, loginUrl }),
  );
  await sendEmail({
    to: [volunteerEmail],
    subject: `Approved: Your request to serve as ${roleName} at ${churchName}`,
    html,
    bcc: adminBccEmails,
  });
}

interface RoleRequestRejectedParams {
  volunteerEmail: string;
  volunteerName: string;
  roleName: string;
  churchName: string;
  rejectionNote?: string;
  adminBccEmails: string[];
}

export async function sendRoleRequestRejectedNotification(params: RoleRequestRejectedParams) {
  const { volunteerEmail, volunteerName, roleName, churchName, rejectionNote, adminBccEmails } = params;
  const html = render(
    React.createElement(RoleRequestRejectedEmail, { volunteerName, roleName, churchName, rejectionNote }),
  );
  await sendEmail({
    to: [volunteerEmail],
    subject: `Update on your request to serve as ${roleName} at ${churchName}`,
    html,
    bcc: adminBccEmails,
  });
}
