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
  Hr,
} from "@react-email/components";
import * as React from "react";

interface TradeRequestEmailProps {
  recipientName: string;
  requesterName: string;
  requesterRoleName: string;
  requesterEventName: string;
  requesterEventDate: string;
  targetRoleName: string;
  targetEventName: string;
  targetEventDate: string;
  churchName: string;
  acceptUrl: string;
}

export const TradeRequestEmail = ({
  recipientName = "Jane Smith",
  requesterName = "John Doe",
  requesterRoleName = "Lector",
  requesterEventName = "Sunday 10am Service",
  requesterEventDate = "Sunday, July 28, 2024 at 10:00 AM",
  targetRoleName = "Usher",
  targetEventName = "Saturday 5pm Service",
  targetEventDate = "Saturday, July 27, 2024 at 5:00 PM",
  churchName = "St. Augustine's Parish",
  acceptUrl = "http://localhost:3000/claim-trade",
}: TradeRequestEmailProps) => (
  <Html>
    <Head />
    <Preview>{requesterName} wants to trade assignments with you</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Trade Request</Heading>
        <Text style={text}>Hi {recipientName},</Text>
        <Text style={text}>
          <strong>{requesterName}</strong> from {churchName} would like to trade assignments with
          you. Please review the details below:
        </Text>

        <Section style={detailsSection}>
          <Text style={detailTitle}>They are offering:</Text>
          <Text style={detailText}>
            {requesterRoleName} — {requesterEventName}
          </Text>
          <Text style={detailSubtext}>{requesterEventDate}</Text>

          <Hr style={hr} />

          <Text style={detailTitle}>In exchange for your:</Text>
          <Text style={detailText}>
            {targetRoleName} — {targetEventName}
          </Text>
          <Text style={detailSubtext}>{targetEventDate}</Text>
        </Section>

        <Text style={text}>
          If you accept, your assignments will be swapped automatically. If you decline or ignore
          this email, nothing will change.
        </Text>
        <Button style={button} href={acceptUrl}>
          Review Trade
        </Button>
        <Text style={footer}>Parish Scribe | Powered by RotaScribe</Text>
      </Container>
    </Body>
  </Html>
);

export default TradeRequestEmail;

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
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0 0 2px",
};

const detailSubtext = {
  fontSize: "13px",
  color: "#666",
  margin: "0 0 12px",
};

const hr = {
  borderColor: "#cccccc",
  margin: "15px 0",
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
