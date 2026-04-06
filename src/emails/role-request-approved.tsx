import { Body, Container, Head, Heading, Html, Preview, Text, Button } from "@react-email/components";
import * as React from "react";

interface RoleRequestApprovedEmailProps {
  volunteerName: string;
  roleName: string;
  churchName: string;
  loginUrl: string;
}

export const RoleRequestApprovedEmail = ({
  volunteerName = "Jane Doe",
  roleName = "Lector",
  churchName = "St. Augustine's Parish",
  loginUrl = "http://localhost:3000/dashboard",
}: RoleRequestApprovedEmailProps) => (
  <Html>
    <Head />
    <Preview>Your request to serve as {roleName} at {churchName} has been approved!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Request Approved!</Heading>
        <Text style={text}>Hi {volunteerName},</Text>
        <Text style={text}>
          Great news! Your request to serve as <strong>{roleName}</strong> at {churchName} has been approved. This role has been added to your serving profile and you may begin receiving scheduling assignments for it.
        </Text>
        <Button style={button} href={loginUrl}>
          Go to Your Dashboard
        </Button>
        <Text style={text}>
          Thank you for your willingness to serve — we look forward to having you in this role!
        </Text>
        <Text style={footer}>Parish Scribe | RotaScribe</Text>
      </Container>
    </Body>
  </Html>
);

export default RoleRequestApprovedEmail;

const main = { backgroundColor: "#f6f9fc", padding: "10px 0", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { backgroundColor: "#ffffff", border: "1px solid #f0f0f0", padding: "45px", width: "465px", margin: "0 auto" };
const h1 = { color: "#1d1d1d", fontSize: "28px", fontWeight: "700", margin: "0 0 20px" };
const text = { color: "#333", fontSize: "14px", lineHeight: "24px", margin: "16px 0" };
const button = { backgroundColor: "#000000", borderRadius: "3px", color: "#ffffff", fontSize: "14px", textDecoration: "none", textAlign: "center" as const, display: "block", padding: "12px 20px" };
const footer = { color: "#8898aa", fontSize: "12px", lineHeight: "16px", textAlign: "center" as const, marginTop: "20px" };
