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

interface AssignmentNotificationEmailProps {
  volunteerName: string;
  eventName: string;
  eventDate: string;
  roleName: string;
  churchName: string;
  loginUrl: string;
}

export const AssignmentNotificationEmail = ({
  volunteerName = "John Doe",
  eventName = "Sunday Morning Service",
  eventDate = "Sunday, July 28, 2024 at 10:00 AM",
  roleName = "Lector",
  churchName = "St. Augustine's Parish",
  loginUrl = "http://localhost:3000/",
}: AssignmentNotificationEmailProps) => (
  <Html>
    <Head />
    <Preview>You have a new assignment on Parish Scribe!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Assignment Confirmation</Heading>
        <Text style={text}>Hi {volunteerName},</Text>
        <Text style={text}>
          This is a confirmation that you have been assigned to serve at an upcoming event for{" "}
          {churchName}.
        </Text>
        <Section style={detailsSection}>
          <Text style={detailTitle}>Event:</Text>
          <Text style={detailText}>{eventName}</Text>

          <Text style={detailTitle}>Date & Time:</Text>
          <Text style={detailText}>{eventDate}</Text>

          <Text style={detailTitle}>Your Role:</Text>
          <Text style={detailText}>{roleName}</Text>
        </Section>
        <Text style={text}>
          Thank you for your willingness to serve! If you have any questions or need to request a
          substitute, please log in to the Parish Scribe portal.
        </Text>
        <Button style={button} href={loginUrl}>
          Go to Dashboard
        </Button>
        <Text style={footer}>Parish Scribe | Powered by RotaScribe</Text>
      </Container>
    </Body>
  </Html>
);

export default AssignmentNotificationEmail;

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
