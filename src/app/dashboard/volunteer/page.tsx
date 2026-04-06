
"use client";

import { useUser } from "@/firebase";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar, Users, CalendarOff, LifeBuoy, ListTodo } from "lucide-react";

export default function VolunteerDashboardPage() {
  const { user } = useUser();

  return (
    <div className="flex flex-col items-center justify-start pb-8">
      <div className="w-full max-w-5xl">
        <header className="mb-12 text-center pt-8">
          <h1 className="text-3xl lg:text-4xl font-bold">
            Welcome, {user?.displayName || "Volunteer"}!
          </h1>
          <p className="text-muted-foreground text-lg mt-2 max-w-2xl mx-auto">
            This is your personal dashboard. Here you can view your schedule and manage your serving
            preferences.
          </p>
        </header>
        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/dashboard/volunteer/schedule" className="sm:col-span-2 flex">
            <Card className="hover:bg-muted/50 transition-colors h-full w-full flex flex-col group border-brand-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Calendar className="h-8 w-8 text-brand-accent" />
                  My Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">
                  View your upcoming assignments and respond to requests.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/volunteer/preferences" className="flex">
            <Card className="hover:bg-muted/50 transition-colors h-full w-full flex flex-col group border-brand-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <ListTodo className="h-8 w-8 text-brand-accent" />
                  My Serving Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">
                  Tell your admin which services you attend and which roles you can serve in.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/volunteer/availability" className="flex">
            <Card className="hover:bg-muted/50 transition-colors h-full w-full flex flex-col group border-brand-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <CalendarOff className="h-8 w-8 text-brand-accent" />
                  My Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">
                  Mark dates when you&apos;re unavailable so you won&apos;t be scheduled on those days.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/volunteer/family" className="flex">
            <Card className="hover:bg-muted/50 transition-colors h-full w-full flex flex-col group border-brand-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Users className="h-8 w-8 text-brand-accent" />
                  Family
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">
                  Manage your household and set serving preferences.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/support?from=volunteer" className="lg:col-span-2 flex">
            <Card className="hover:bg-muted/50 transition-colors h-full w-full flex flex-col group border-brand-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <LifeBuoy className="h-8 w-8 text-brand-accent" />
                  Help & Support
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">
                  Submit a support ticket or get help with the application.
                </p>
              </CardContent>
            </Card>
          </Link>
        </main>
      </div>
    </div>
  );
}

