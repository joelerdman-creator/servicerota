
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, CalendarOff, ListTodo } from "lucide-react";

export default function ManageVolunteerPage() {
  const { volunteerId } = useParams();

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background p-8">
      <div className="w-full max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Volunteer Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage this volunteer&apos;s availability, family settings, and role assignments.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href={`/dashboard/admin/manage/${volunteerId as string}/availability`}
            className="flex"
          >
            <Card className="hover:bg-muted/50 transition-colors w-full flex flex-col h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <CalendarOff className="h-6 w-6 text-primary" />
                  <span className="text-lg font-semibold">Manage Availability</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Set block-out dates for this volunteer and their family.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href={`/dashboard/admin/manage/${volunteerId as string}/family`} className="flex">
            <Card className="hover:bg-muted/50 transition-colors w-full flex flex-col h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  <span className="text-lg font-semibold">Manage Family</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Add family members and set serving preferences for this household.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
