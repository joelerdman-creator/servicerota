import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";
import { DebugConsole } from "@/components/DebugConsole";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontDisplay = Lora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Parish Scribe — Church Volunteer Scheduling Software",
    template: "%s | Parish Scribe",
  },
  description:
    "Parish Scribe automates volunteer scheduling for churches. AI-powered rota builder, automated email & SMS reminders, substitution requests, and calendar feeds. Free plan available.",
  keywords: [
    "church volunteer scheduling",
    "church rota software",
    "volunteer management church",
    "parish scheduling app",
    "liturgical volunteer scheduler",
    "church volunteer coordinator",
    "automated church rota",
  ],
  openGraph: {
    type: "website",
    siteName: "Parish Scribe",
    title: "Parish Scribe — Church Volunteer Scheduling Software",
    description:
      "Automate your church volunteer rota. AI scheduling, email & SMS reminders, and a self-service portal your volunteers will love.",
    url: "https://parishscribe.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Parish Scribe — Church Volunteer Scheduling Software",
    description:
      "Automate your church volunteer rota. AI scheduling, email & SMS reminders, and a self-service portal your volunteers will love.",
  },
  metadataBase: new URL("https://parishscribe.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontDisplay.variable,
        )}
      >
        <Providers>
          <ImpersonationBanner />
          {children}
          <DebugConsole />
        </Providers>
      </body>
    </html>
  );
}
