import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Button,
} from "@react-email/components";
import * as React from "react";

interface EventReminderEmailProps {
  volunteerName: string;
  eventName: string;
  eventDate: string;
  roleName: string;
  churchName: string;
  loginUrl: string;
}

export const EventReminderEmail = ({
  volunteerName = "Jane Doe",
  eventName = "Sunday Morning Service",
  eventDate = "Sunday, April 6, 2026 at 10:00 AM",
  roleName = "Lector",
  churchName = "St. Augustine's Parish",
  loginUrl = "http://localhost:3000/dashboard",
}: EventReminderEmailProps) => (
  <Html>
    <Head />
    <Preview>Reminder: You&apos;re serving as {roleName} at {eventName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Serving Reminder</Heading>
        <Text style={text}>Hi {volunteerName},</Text>
        <Text style={text}>
          This is a reminder that you&apos;re scheduled to serve at <strong>{churchName}</strong>.
        </Text>
        <div style={detailsBox}>
          <Text style={detailsText}>
            <strong>Event:</strong> {eventName}
          </Text>
          <Text style={detailsText}>
            <strong>Date:</strong> {eventDate}
          </Text>
          <Text style={detailsText}>
            <strong>Role:</strong> {roleName}
          </Text>
        </div>
        <Text style={text}>
          If you can no longer make it, please log in as soon as possible so a substitute can be
          arranged.
        </Text>
        <Button style={button} href={`${loginUrl}/volunteer/schedule`}>
          View My Schedule
        </Button>
        <Text style={text}>Thank you for your service!</Text>
        <Text style={footer}>Parish Scribe | Powered by RotaScribe</Text>
      </Container>
    </Body>
  </Html>
);

export default EventReminderEmail;

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

const detailsBox = {
  backgroundColor: "#f6f9fc",
  borderLeft: "4px solid #166534",
  padding: "16px 20px",
  margin: "16px 0",
  borderRadius: "4px",
};

const detailsText = {
  color: "#333",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "4px 0",
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
