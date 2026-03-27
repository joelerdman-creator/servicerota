
"use client";

import { useUser, useDoc, useFirestore } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import Link from "next/link";
import { doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar, Users, CalendarOff, LifeBuoy, ListTodo } from "lucide-react";

interface UserProfile {
  isAdmin?: boolean;
}

export default function VolunteerDashboardPage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const handleLogOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      await fetch("/api/auth/session", { method: "DELETE" });
      toast.success("Signed out successfully.");
      window.location.href = "/";
    } catch (error: any) {
      toast.error((error as Error).message || "Failed to sign out.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background pt-8 pb-8 px-4 sm:px-8">
      <div className="w-full max-w-5xl">
        <header className="mb-12 text-center">
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
                  Which Services I Attend
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">
                  Tell your admin which regular services you attend so they can schedule you at the right times.
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/volunteer/availability" className="flex">
            <Card className="hover:bg-muted/50 transition-colors h-full w-full flex flex-col group border-brand-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <CalendarOff className="h-8 w-8 text-brand-accent" />
                  My Block-out Dates
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
        <footer className="mt-12 flex justify-center items-center gap-4">
          {userProfile?.isAdmin && (
            <Button asChild variant="outline">
              <Link href="/dashboard/admin">Switch to Admin View</Link>
            </Button>
          )}
          <Button onClick={handleLogOut} variant="ghost" className="text-muted-foreground">
            Log Out
          </Button>
        </footer>
      </div>
    </div>
  );
}
