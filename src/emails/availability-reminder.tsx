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

interface AvailabilityReminderEmailProps {
  volunteerName: string;
  churchName: string;
  dueDate: string;
  loginUrl: string;
}

export const AvailabilityReminderEmail = ({
  volunteerName = "Jane Doe",
  churchName = "St. Augustine's Parish",
  dueDate = "April 20, 2026",
  loginUrl = "http://localhost:3000/dashboard",
}: AvailabilityReminderEmailProps) => (
  <Html>
    <Head />
    <Preview>Action needed: Submit your availability for {churchName} by {dueDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Availability Reminder</Heading>
        <Text style={text}>Hi {volunteerName},</Text>
        <Text style={text}>
          This is a friendly reminder to update your availability for upcoming services at{" "}
          {churchName}. The scheduling team needs your block-out dates by{" "}
          <strong>{dueDate}</strong> so they can build the schedule.
        </Text>
        <Text style={text}>
          If you have dates you won&apos;t be available, please log in and mark them now. If
          you&apos;re available as usual, no action is needed.
        </Text>
        <Button style={button} href={`${loginUrl}/volunteer/availability`}>
          Update My Availability
        </Button>
        <Text style={text}>Thank you for serving — it makes a real difference!</Text>
        <Text style={footer}>Parish Scribe | Powered by RotaScribe</Text>
      </Container>
    </Body>
  </Html>
);

export default AvailabilityReminderEmail;

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
