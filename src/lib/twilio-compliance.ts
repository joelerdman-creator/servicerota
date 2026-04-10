"use server";

import Twilio from "twilio";

// Only init client if keys exist, avoiding build-time errors
const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

/**
 * Helper to fetch the Phone Number SID from Twilio by raw number string.
 */
export async function getPhoneNumberSid(rawNumber: string): Promise<string | null> {
  if (!client) throw new Error("Twilio not configured");
  try {
    const rawDigits = rawNumber.replace(/\D/g, "");
    const numbers = await client.incomingPhoneNumbers.list({
      phoneNumber: rawDigits.length === 10 ? `+1${rawDigits}` : `+${rawDigits}`,
      limit: 1,
    });
    return numbers.length > 0 ? numbers[0].sid : null;
  } catch (error) {
    console.error("Failed to fetch phone number SID", error);
    return null;
  }
}

/**
 * Gets the current Toll-Free verification status for the configured number
 */
export async function getTollFreeStatus(phoneNumber: string) {
  if (!client) throw new Error("Twilio not configured");
  
  const sid = await getPhoneNumberSid(phoneNumber);
  if (!sid) throw new Error("Could not find the specified phone number in Twilio account");

  const verifications = await client.messaging.v1.tollfreeVerifications.list({
    tollfreePhoneNumberSid: sid,
    limit: 1,
  });

  if (verifications.length === 0) {
    return { status: "UNREGISTERED" };
  }

  const v = verifications[0];
  return {
    sid: v.sid,
    status: v.status, // UNVERIFIED, PENDING, VERIFIED, INELIGIBLE, etc.
    dateCreated: v.dateCreated,
    dateUpdated: v.dateUpdated,
  };
}

export type TwilioOptInType = "VERBAL" | "WEB_FORM" | "PAPER_FORM" | "VIA_TEXT" | "MOBILE_QR_CODE";

export interface TollFreeFormData {
  businessName: string;
  businessWebsite: string;
  notificationEmail: string;
  useCaseCategories: string[];
  useCaseSummary: string;
  productionMessageSample: string;
  optInImageUrls: string[];
  optInType: TwilioOptInType;
  messageVolume: string;
  businessContactFirstName: string;
  businessContactLastName: string;
  businessContactEmail: string;
  businessContactPhone: string;
  businessStreetAddress: string;
  businessCity: string;
  businessStateProvinceRegion: string;
  businessPostalCode: string;
  businessCountry: string;
}

export async function getLocalComplianceStatus() {
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!phoneNumber) throw new Error("TWILIO_PHONE_NUMBER is not set on the server.");
  const statusInfo = await getTollFreeStatus(phoneNumber);
  return { phoneNumber, ...statusInfo };
}

/**
 * Submits the Toll-Free Verification request directly to Twilio.
 */
export async function submitTollFreeVerification(data: TollFreeFormData) {
  if (!client) throw new Error("Twilio not configured");

  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!phoneNumber) throw new Error("TWILIO_PHONE_NUMBER is not set on the server.");

  const sid = await getPhoneNumberSid(phoneNumber);
  if (!sid) throw new Error("Could not find phone number SID to verify");

  try {
    const verification = await client.messaging.v1.tollfreeVerifications.create({
      tollfreePhoneNumberSid: sid,
      businessName: data.businessName,
      businessWebsite: data.businessWebsite,
      notificationEmail: data.notificationEmail,
      useCaseCategories: data.useCaseCategories,
      useCaseSummary: data.useCaseSummary,
      productionMessageSample: data.productionMessageSample,
      optInImageUrls: data.optInImageUrls,
      optInType: data.optInType,
      messageVolume: data.messageVolume,
      businessContactFirstName: data.businessContactFirstName,
      businessContactLastName: data.businessContactLastName,
      businessContactEmail: data.businessContactEmail,
      businessContactPhone: data.businessContactPhone,
      businessStreetAddress: data.businessStreetAddress,
      businessCity: data.businessCity,
      businessStateProvinceRegion: data.businessStateProvinceRegion,
      businessPostalCode: data.businessPostalCode,
      businessCountry: data.businessCountry,
    });

    return { success: true, verificationSid: verification.sid, status: verification.status };
  } catch (err: any) {
    console.error("Failed to submit Toll-Free verification API", err);
    throw new Error(err.message || "Failed to submit Toll-Free Verification");
  }
}
