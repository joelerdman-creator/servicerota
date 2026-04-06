import { Body, Container, Head, Heading, Html, Preview, Text, Button, Hr } from "@react-email/components";
import * as React from "react";

interface RoleRequestSubmittedEmailProps {
  adminName: string;
  volunteerName: string;
  roleName: string;
  churchName: string;
  message?: string;
  dashboardUrl: string;
}

export const RoleRequestSubmittedEmail = ({
  adminName = "Admin",
  volunteerName = "Jane Doe",
  roleName = "Lector",
  churchName = "St. Augustine's Parish",
  message,
  dashboardUrl = "http://localhost:3000/dashboard/admin/volunteers",
}: RoleRequestSubmittedEmailProps) => (
  <Html>
    <Head />
    <Preview>{volunteerName} has requested to serve as {roleName} at {churchName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Role Request</Heading>
        <Text style={text}>Hi {adminName},</Text>
        <Text style={text}>
          <strong>{volunteerName}</strong> has requested to start serving as <strong>{roleName}</strong> at {churchName}.
        </Text>
        {message && (
          <>
            <Hr style={hr} />
            <Text style={label}>Message from {volunteerName}:</Text>
            <Text style={messageBox}>{message}</Text>
            <Hr style={hr} />
          </>
        )}
        <Text style={text}>
          Review and approve or decline this request from the Volunteers page.
        </Text>
        <Button style={button} href={dashboardUrl}>
          Review Request
        </Button>
        <Text style={footer}>Parish Scribe | RotaScribe</Text>
      </Container>
    </Body>
  </Html>
);

export default RoleRequestSubmittedEmail;

const main = { backgroundColor: "#f6f9fc", padding: "10px 0", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { backgroundColor: "#ffffff", border: "1px solid #f0f0f0", padding: "45px", width: "465px", margin: "0 auto" };
const h1 = { color: "#1d1d1d", fontSize: "28px", fontWeight: "700", margin: "0 0 20px" };
const text = { color: "#333", fontSize: "14px", lineHeight: "24px", margin: "16px 0" };
const label = { color: "#555", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" as const, letterSpacing: "0.05em", margin: "8px 0 4px" };
const messageBox = { color: "#333", fontSize: "14px", lineHeight: "22px", backgroundColor: "#f8f9fa", border: "1px solid #e9ecef", borderRadius: "4px", padding: "12px 16px", margin: "0 0 8px" };
const hr = { borderColor: "#f0f0f0", margin: "16px 0" };
const button = { backgroundColor: "#000000", borderRadius: "3px", color: "#ffffff", fontSize: "14px", textDecoration: "none", textAlign: "center" as const, display: "block", padding: "12px 20px" };
const footer = { color: "#8898aa", fontSize: "12px", lineHeight: "16px", textAlign: "center" as const, marginTop: "20px" };
