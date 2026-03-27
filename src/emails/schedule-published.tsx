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

interface Assignment {
  volunteerName: string;
  eventName: string;
  eventDate: string;
  roleName: string;
}

interface SchedulePublishedEmailProps {
  recipientName: string;
  churchName: string;
  assignments: Assignment[];
  loginUrl: string;
}

export const SchedulePublishedEmail = ({
  recipientName = "John Doe",
  churchName = "St. Augustine's Parish",
  assignments = [],
  loginUrl = "http://localhost:3000/dashboard",
}: SchedulePublishedEmailProps) => (
  <Html>
    <Head />
    <Preview>The new schedule is available on Parish Scribe!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>The Schedule is Published!</Heading>
        <Text style={text}>Hi {recipientName},</Text>
        <Text style={text}>
          The new volunteer schedule has been published by {churchName}. You or a member of your
          family have been assigned to the following role(s):
        </Text>

        <Section style={detailsSection}>
          {assignments.map((assignment, index) => (
            <React.Fragment key={index}>
              <Text>
                <strong>Volunteer:</strong> {assignment.volunteerName}
              </Text>
              <Text>
                <strong>Event:</strong> {assignment.eventName} on {assignment.eventDate}
              </Text>
              <Text>
                <strong>Role:</strong> {assignment.roleName}
              </Text>
              {index < assignments.length - 1 && <Hr style={hr} />}
            </React.Fragment>
          ))}
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

export default SchedulePublishedEmail;

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
