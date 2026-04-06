"use server";

import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("Email sending is disabled. RESEND_API_KEY is not set.");
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

interface EmailParams {
  to: string[];
  subject: string;
  html: string;
  bcc?: string[];
}

export async function sendEmail({ to, subject, html, bcc }: EmailParams) {
  if (!resend) {
    const message = "Email not sent because RESEND_API_KEY is not configured.";
    console.warn(message, { to, subject });
    return { success: false, message };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Parish Scribe <${fromEmail}>`,
      to,
      subject,
      html,
      ...(bcc && bcc.length > 0 ? { bcc } : {}),
    });

    if (error) {
      console.error("Failed to send email:", error);
      return { success: false, error };
    }

    console.log("Email sent successfully:", data);
    return { success: true, data };
  } catch (exception) {
    console.error("An exception occurred while sending email:", exception);
    return { success: false, error: exception };
  }
}
