import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Button,
  Section,
} from "@react-email/components";
import * as React from "react";

interface TradeAcceptedEmailProps {
  requesterName: string;
  acceptedByName: string;
  newRoleName: string;
  newEventName: string;
  newEventDate: string;
  churchName: string;
  loginUrl: string;
}

export const TradeAcceptedEmail = ({
  requesterName = "John Doe",
  acceptedByName = "Jane Smith",
  newRoleName = "Usher",
  newEventName = "Saturday 5pm Service",
  newEventDate = "Saturday, July 27, 2024 at 5:00 PM",
  churchName = "St. Augustine's Parish",
  loginUrl = "http://localhost:3000/dashboard",
}: TradeAcceptedEmailProps) => (
  <Html>
    <Head />
    <Preview>Your trade request has been accepted!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Trade Accepted!</Heading>
        <Text style={text}>Hi {requesterName},</Text>
        <Text style={text}>
          Great news! <strong>{acceptedByName}</strong> has accepted your trade request at{" "}
          {churchName}. Your assignments have been swapped automatically.
        </Text>
        <Section style={detailsSection}>
          <Text style={detailTitle}>Your New Assignment:</Text>
          <Text style={detailText}>{newRoleName}</Text>
          <Text style={detailSubtext}>
            {newEventName} — {newEventDate}
          </Text>
        </Section>
        <Text style={text}>
          Please check your dashboard for your updated schedule.
        </Text>
        <Button style={button} href={loginUrl}>
          View Your Schedule
        </Button>
        <Text style={footer}>Parish Scribe | Powered by RotaScribe</Text>
      </Container>
    </Body>
  </Html>
);

export default TradeAcceptedEmail;

const main = {
  backgroundColor: "#f6f9fc",
  padding: "10px 0",
  fontFamily: "Helvetica, Arial, sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #f0f0f0",
  padding: "45px",
  width: "465px",
  margin: "0 auto",
};

const h1 = {
  color: "#1d1d1d",
  fontSize: "32px",
  fontWeight: "700",
  margin: "0 0 20px",
};

const text = {
  color: "#333",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const detailsSection = {
  backgroundColor: "#fafafa",
  border: "1px solid #eaeaea",
  borderRadius: "4px",
  padding: "20px",
  margin: "20px 0",
};

const detailTitle = {
  fontWeight: "bold" as const,
  fontSize: "14px",
  margin: "0 0 4px",
  color: "#555",
};

const detailText = {
  fontSize: "16px",
  fontWeight: "600" as const,
  margin: "0 0 2px",
};

const detailSubtext = {
  fontSize: "13px",
  color: "#666",
  margin: "0",
};

const button = {
  backgroundColor: "#000000",
  borderRadius: "3px",
  color: "#ffffff",
  fontSize: "14px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 20px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
  marginTop: "20px",
};
