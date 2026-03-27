"use client";

import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/icons/google";
import toast from "react-hot-toast";
import AppRouter from "@/components/AppRouter";
import { useUser } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup, UserCredential } from "firebase/auth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, Mail, Zap, Feather } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Zap,
    title: "AI-Powered Scheduling",
    description:
      "Automatically generate fair and balanced volunteer schedules in seconds. Our smart algorithm considers volunteer availability, preferences, and serving frequency.",
  },
  {
    icon: Users,
    title: "Centralized Volunteer Hub",
    description:
      "Manage all volunteer information in one place. Track assignments, manage family groups, and empower volunteers to set their own availability.",
  },
  {
    icon: Mail,
    title: "Seamless Communication",
    description:
      "Send automated email notifications for new assignments, reminders, and substitution requests. Keep everyone in the loop without the manual effort.",
  },
];

export default function HomeClient() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin h-10 w-10 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (user) {
    return <AppRouter />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Feather className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Parish Scribe</h1>
          </Link>
          <Button asChild size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 text-center">
          <div className="container px-4 md:px-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
              Effortless Volunteer Scheduling for Your Church
            </h1>
            <p className="mx-auto max-w-3xl text-muted-foreground text-lg md:text-xl mb-10">
              Stop juggling spreadsheets. Parish Scribe uses AI to create fair schedules, manage
              volunteers, and automate communication, so you can focus on what matters most.
            </p>
            <Button asChild size="lg">
              <Link href="/signup">Get Started for Free</Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 md:py-32 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="bg-background">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 p-3 rounded-full">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Parish Scribe. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
