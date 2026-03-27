import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";
import { DebugConsole } from "@/components/DebugConsole";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Parish Scribe",
  description: "SaaS platform for church volunteer management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
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
