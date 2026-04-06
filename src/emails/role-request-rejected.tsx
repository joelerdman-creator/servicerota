import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from "@react-email/components";
import * as React from "react";

interface RoleRequestRejectedEmailProps {
  volunteerName: string;
  roleName: string;
  churchName: string;
  rejectionNote?: string;
}

export const RoleRequestRejectedEmail = ({
  volunteerName = "Jane Doe",
  roleName = "Lector",
  churchName = "St. Augustine's Parish",
  rejectionNote,
}: RoleRequestRejectedEmailProps) => (
  <Html>
    <Head />
    <Preview>An update regarding your request to serve as {roleName} at {churchName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Role Request Update</Heading>
        <Text style={text}>Hi {volunteerName},</Text>
        <Text style={text}>
          Thank you for your interest in serving as <strong>{roleName}</strong> at {churchName}. After review, we are unable to approve this request at this time.
        </Text>
        {rejectionNote && (
          <>
            <Hr style={hr} />
            <Text style={label}>Note from your admin:</Text>
            <Text style={messageBox}>{rejectionNote}</Text>
            <Hr style={hr} />
          </>
        )}
        <Text style={text}>
          Please don't be discouraged — there are many ways to serve. If you have questions, feel free to reach out to your admin directly.
        </Text>
        <Text style={footer}>Parish Scribe | RotaScribe</Text>
      </Container>
    </Body>
  </Html>
);

export default RoleRequestRejectedEmail;

const main = { backgroundColor: "#f6f9fc", padding: "10px 0", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { backgroundColor: "#ffffff", border: "1px solid #f0f0f0", padding: "45px", width: "465px", margin: "0 auto" };
const h1 = { color: "#1d1d1d", fontSize: "28px", fontWeight: "700", margin: "0 0 20px" };
const text = { color: "#333", fontSize: "14px", lineHeight: "24px", margin: "16px 0" };
const label = { color: "#555", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" as const, letterSpacing: "0.05em", margin: "8px 0 4px" };
const messageBox = { color: "#333", fontSize: "14px", lineHeight: "22px", backgroundColor: "#f8f9fa", border: "1px solid #e9ecef", borderRadius: "4px", padding: "12px 16px", margin: "0 0 8px" };
const hr = { borderColor: "#f0f0f0", margin: "16px 0" };
const footer = { color: "#8898aa", fontSize: "12px", lineHeight: "16px", textAlign: "center" as const, marginTop: "20px" };
