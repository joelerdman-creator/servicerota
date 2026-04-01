/**
 * SMS Message Templates
 *
 * Plain-text message generators for each notification type.
 * Keep messages short (< 160 chars if possible) to fit in a single SMS segment.
 */

import { format } from "date-fns";

function fmtDate(isoDate: string): string {
  try {
    return format(new Date(isoDate), "EEE, MMM do @ h:mm a");
  } catch {
    return isoDate;
  }
}

// ─── Individual Notification SMS Templates ───

export function assignmentSms(p: {
  volunteerName: string;
  roleName: string;
  eventName: string;
  eventDate: string;
  churchName: string;
}): string {
  return `Hi ${p.volunteerName}! You've been assigned as ${p.roleName} for ${p.eventName} on ${fmtDate(p.eventDate)} at ${p.churchName}. Log in to view details.`;
}

export function volunteerInvitationSms(p: {
  volunteerName: string;
  churchName: string;
  claimUrl: string;
}): string {
  return `Hi ${p.volunteerName}! You've been invited to volunteer at ${p.churchName} on Parish Scribe. Create your account: ${p.claimUrl}`;
}

export function substitutionRequestSms(p: {
  recipientName: string;
  requestingVolunteerName: string;
  roleName: string;
  eventName: string;
  eventDate: string;
  claimUrl: string;
}): string {
  return `Hi ${p.recipientName}, ${p.requestingVolunteerName} needs a sub for ${p.roleName} at ${p.eventName} (${fmtDate(p.eventDate)}). Claim it: ${p.claimUrl}`;
}

export function approvalConfirmationSms(p: {
  volunteerName: string;
  churchName: string;
}): string {
  return `Welcome, ${p.volunteerName}! Your volunteer account at ${p.churchName} has been approved. Log in to Parish Scribe to view your dashboard.`;
}

export function substitutionClaimedSms(p: {
  originalVolunteerName: string;
  claimedByName: string;
  roleName: string;
  eventName: string;
}): string {
  return `Hi ${p.originalVolunteerName}, great news! ${p.claimedByName} has filled your ${p.roleName} spot for ${p.eventName}. You're off the hook!`;
}

export function tradeRequestSms(p: {
  recipientName: string;
  requesterName: string;
  requesterRoleName: string;
  targetRoleName: string;
  acceptUrl: string;
}): string {
  return `Hi ${p.recipientName}, ${p.requesterName} wants to trade their ${p.requesterRoleName} for your ${p.targetRoleName}. Review: ${p.acceptUrl}`;
}

export function tradeAcceptedSms(p: {
  requesterName: string;
  acceptedByName: string;
  newRoleName: string;
  newEventName: string;
  newEventDate: string;
}): string {
  return `Hi ${p.requesterName}! ${p.acceptedByName} accepted your trade. You're now assigned ${p.newRoleName} at ${p.newEventName} (${fmtDate(p.newEventDate)}).`;
}

export function availabilityReminderSms(p: {
  volunteerName: string;
  churchName: string;
  dueDate: string;
}): string {
  return `Hi ${p.volunteerName}, please update your availability for ${p.churchName} by ${p.dueDate}. Log in to Parish Scribe to set your block-out dates.`;
}

export function eventReminderSms(p: {
  volunteerName: string;
  roleName: string;
  eventName: string;
  eventDate: string;
  churchName: string;
}): string {
  return `Hi ${p.volunteerName}, reminder: you're serving as ${p.roleName} at ${p.eventName} on ${fmtDate(p.eventDate)} (${p.churchName}). Log in to view your schedule.`;
}

// ─── Schedule Published SMS ───

export function schedulePublishedSms(p: {
  recipientName: string;
  churchName: string;
  assignmentCount: number;
}): string {
  return `Hi ${p.recipientName}, the ${p.churchName} schedule has been published. You have ${p.assignmentCount} assignment(s). Log in to Parish Scribe to view.`;
}
