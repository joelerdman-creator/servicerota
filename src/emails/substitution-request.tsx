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

interface SubstitutionRequestEmailProps {
  recipientName: string;
  requestingVolunteerName: string;
  eventName: string;
  eventDate: string;
  roleName: string;
  churchName: string;
  claimUrl: string;
}

export const SubstitutionRequestEmail = ({
  recipientName = "Volunteer",
  requestingVolunteerName = "John Doe",
  eventName = "Sunday Morning Service",
  eventDate = "Sunday, July 28, 2024 at 10:00 AM",
  roleName = "Lector",
  churchName = "St. Augustine's Parish",
  claimUrl = "http://localhost:3000/",
}: SubstitutionRequestEmailProps) => (
  <Html>
    <Head />
    <Preview>A volunteer role is available at {churchName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Substitution Needed</Heading>
        <Text style={text}>Hi {recipientName},</Text>
        <Text style={text}>
          An opening has become available to serve at {churchName}. {requestingVolunteerName} is
          unable to fill their scheduled role and is looking for a substitute.
        </Text>
        <Section style={detailsSection}>
          <Text style={detailTitle}>Event:</Text>
          <Text style={detailText}>{eventName}</Text>

          <Text style={detailTitle}>Date & Time:</Text>
          <Text style={detailText}>{eventDate}</Text>

          <Text style={detailTitle}>Open Role:</Text>
          <Text style={detailText}>{roleName}</Text>
        </Section>
        <Text style={text}>
          If you are available and would like to fill this role, please click the button below. The
          position will be filled on a first-come, first-served basis.
        </Text>
        <Button style={button} href={claimUrl}>
          Accept this Role
        </Button>
        <Text style={footer}>Parish Scribe | Powered by RotaScribe</Text>
      </Container>
    </Body>
  </Html>
);

export default SubstitutionRequestEmail;

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
