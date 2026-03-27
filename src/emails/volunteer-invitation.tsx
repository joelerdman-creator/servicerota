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

interface VolunteerInvitationEmailProps {
  volunteerName: string;
  churchName: string;
  adminName: string;
  claimUrl: string;
}

export const VolunteerInvitationEmail = ({
  volunteerName = "Jane Doe",
  churchName = "St. Augustine's Parish",
  adminName = "John Smith",
  claimUrl = "http://localhost:3000/claim-account",
}: VolunteerInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>You've been invited to join {churchName} on Parish Scribe!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're Invited!</Heading>
        <Text style={text}>Hi {volunteerName},</Text>
        <Text style={text}>
          {adminName} has invited you to join the volunteer team for {churchName} on Parish Scribe, our
          volunteer scheduling platform.
        </Text>
        <Text style={text}>
          To get started, view your schedule, and manage your availability, click the button below
          to create your account and claim your profile.
        </Text>
        <Button style={button} href={claimUrl}>
          Create Your Account
        </Button>
        <Text style={text}>
          If you did not expect this invitation, you can safely ignore this email.
        </Text>
        <Text style={footer}>Parish Scribe | Powered by RotaScribe</Text>
      </Container>
    </Body>
  </Html>
);

export default VolunteerInvitationEmail;

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
