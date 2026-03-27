"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, LifeBuoy } from "lucide-react";
import Link from "next/link";

export default function SuperUserDashboardPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Super User Dashboard</h1>
        <p className="text-muted-foreground">Global platform management and support tools.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/superuser/users" className="flex">
          <Card className="hover:bg-muted/50 transition-colors w-full h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                Global User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                View, manage, and impersonate any user on the platform.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/superuser/tickets" className="flex">
          <Card className="hover:bg-muted/50 transition-colors w-full h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <LifeBuoy className="h-6 w-6 text-primary" />
                Support Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>View and respond to support tickets from all users.</CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
