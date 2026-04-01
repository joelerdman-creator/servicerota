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

interface SubstitutionClaimedEmailProps {
  originalVolunteerName: string;
  claimedByName: string;
  eventName: string;
  eventDate: string;
  roleName: string;
  churchName: string;
  loginUrl: string;
}

export const SubstitutionClaimedEmail = ({
  originalVolunteerName = "John Doe",
  claimedByName = "Jane Smith",
  eventName = "Sunday Morning Service",
  eventDate = "Sunday, July 28, 2024 at 10:00 AM",
  roleName = "Lector",
  churchName = "St. Augustine's Parish",
  loginUrl = "http://localhost:3000/dashboard",
}: SubstitutionClaimedEmailProps) => (
  <Html>
    <Head />
    <Preview>Your substitution request has been filled!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Substitute Found!</Heading>
        <Text style={text}>Hi {originalVolunteerName},</Text>
        <Text style={text}>
          Good news! Your substitution request for {churchName} has been filled.{" "}
          <strong>{claimedByName}</strong> has volunteered to take over your role.
        </Text>
        <Section style={detailsSection}>
          <Text style={detailTitle}>Event:</Text>
          <Text style={detailText}>{eventName}</Text>

          <Text style={detailTitle}>Date & Time:</Text>
          <Text style={detailText}>{eventDate}</Text>

          <Text style={detailTitle}>Role:</Text>
          <Text style={detailText}>{roleName}</Text>

          <Text style={detailTitle}>Filled by:</Text>
          <Text style={detailText}>{claimedByName}</Text>
        </Section>
        <Text style={text}>
          You are no longer responsible for this assignment. Thank you for giving others the
          opportunity to serve!
        </Text>
        <Button style={button} href={loginUrl}>
          View Your Schedule
        </Button>
        <Text style={footer}>Parish Scribe | Powered by RotaScribe</Text>
      </Container>
    </Body>
  </Html>
);

export default SubstitutionClaimedEmail;

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
};

const detailText = {
  fontSize: "14px",
  margin: "0 0 12px",
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
