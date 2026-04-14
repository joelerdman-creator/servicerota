
"use client";

import { useState } from "react";
import { useFirestore, useUser, useDoc, useCollection } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import {
  collection,
  query,
  where,
  doc,
  addDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { LifeBuoy } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  churchId?: string | null;
  role?: "admin" | "volunteer" | null;
}

interface SupportTicket {
  id?: string;
  subject: string;
  description?: string;
  submittedByUid: string;
  submittedByName?: string;
  churchId?: string | null;
  status: "Open" | "In Progress" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Critical";
  category?: "Access" | "Billing" | "Technical" | "Scheduling" | "Other";
  createdAt: { seconds: number; nanoseconds: number } | any;
  lastActivityAt?: any;
}

const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "destructive"> = {
  Low: "outline",
  Medium: "warning",
  High: "destructive",
  Critical: "destructive",
};

function SupportPageContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SupportTicket["priority"]>("Medium");
  const [category, setCategory] = useState<SupportTicket["category"]>("Technical");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchParams = useSearchParams();
  const fromSource = searchParams.get("from");

  // --- Data Fetching ---
  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const userTicketsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, "support_tickets"), where("submittedByUid", "==", user.uid));
  }, [firestore, user?.uid]);

  const { data: rawTickets, isLoading: ticketsLoading } =
    useCollection<SupportTicket>(userTicketsQuery);

  const tickets = rawTickets?.sort((a, b) => {
    const dateA = a.createdAt?.seconds || 0;
    const dateB = b.createdAt?.seconds || 0;
    return dateB - dateA;
  });

  const handleSubmitTicket = async () => {
    if (!firestore || !user || !userProfile) {
      toast.error("You must be logged in to submit a ticket.");
      return;
    }
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill out both subject and description.");
      return;
    }

    setIsSubmitting(true);
    const ticketData: Partial<SupportTicket> = {
      subject: subject.trim(),
      description: description.trim(),
      submittedByUid: user.uid,
      submittedByName: user.displayName || user.email || "Unknown",
      churchId: userProfile.churchId || null,
      status: "Open",
      priority,
      category,
      createdAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    };

    const ticketsCollectionRef = collection(firestore, "support_tickets");
    try {
      await addDoc(ticketsCollectionRef, ticketData);
      toast.success("Support ticket submitted successfully!");
      setSubject("");
      setDescription("");
      setPriority("Medium");
      setCategory("Technical");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to submit ticket.");
      const permissionError = new FirestorePermissionError({
        path: ticketsCollectionRef.path,
        operation: "create",
        requestResourceData: ticketData,
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusVariant = (status: SupportTicket["status"]) => {
    switch (status) {
      case "Open":
        return "warning";
      case "In Progress":
        return "info";
      case "Closed":
        return "default";
      default:
        return "outline";
    }
  };

  const formatDate = (timestamp: SupportTicket["createdAt"]) => {
    if (!timestamp) return "N/A";
    if (timestamp.seconds) {
      return format(new Date(timestamp.seconds * 1000), "MMM d, yyyy");
    }
    return format(new Date(timestamp), "MMM d, yyyy");
  };

  let backLink = "/dashboard/volunteer";
  if (fromSource === "volunteer") {
    backLink = "/dashboard/volunteer";
  } else if (userProfile?.role === "admin") {
    backLink = "/dashboard/admin";
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LifeBuoy className="h-8 w-8" />
            Help & Support
          </h1>
          <p className="text-muted-foreground mt-2">
            Submit a new ticket or check the status of your existing requests.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>New Support Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Issue with schedule"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as SupportTicket["category"])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Access">Access</SelectItem>
                        <SelectItem value="Billing">Billing</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="Scheduling">Scheduling</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as SupportTicket["priority"])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please describe the issue in detail..."
                    rows={6}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSubmitTicket} disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>My Tickets</CardTitle>
                <CardDescription>A list of your submitted support tickets.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ticketsLoading && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            Loading your tickets...
                          </TableCell>
                        </TableRow>
                      )}
                      {!ticketsLoading && tickets?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            You haven't submitted any tickets.
                          </TableCell>
                        </TableRow>
                      )}
                      {tickets?.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">
                            <div>{ticket.subject}</div>
                            {ticket.category && (
                              <div className="text-xs text-muted-foreground">{ticket.category}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {ticket.priority ? (
                              <Badge variant={PRIORITY_VARIANT[ticket.priority] ?? "outline"}>
                                {ticket.priority}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/dashboard/support/${ticket.id}`}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                            >
                              View
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <footer className="mt-8 flex justify-center">
          <Button asChild variant="link">
            <Link href={backLink}>Back to Dashboard</Link>
          </Button>
        </footer>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={null}>
      <SupportPageContent />
    </Suspense>
  );
}
