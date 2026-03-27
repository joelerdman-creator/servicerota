
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useDoc, useFirestore } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import { doc } from "firebase/firestore";
import { useParams } from "next/navigation";

interface Volunteer {
  firstName: string;
  lastName: string;
}

export default function ManageVolunteerLayout({ children }: { children: React.ReactNode }) {
  const { volunteerId } = useParams();
  const firestore = useFirestore();

  const volunteerDocRef = useMemoFirebase(
    () => (firestore && volunteerId ? doc(firestore, "users", volunteerId as string) : null),
    [firestore, volunteerId],
  );
  const { data: volunteer, isLoading } = useDoc<Volunteer>(volunteerDocRef);

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/volunteers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-lg font-semibold">Managing Volunteer</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Loading..."
                  : `${volunteer?.firstName ?? ""} ${volunteer?.lastName ?? ""}`}
              </p>
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
