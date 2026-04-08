"use client";

import { useState } from "react";
import {
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  useCollection,
  errorEmitter,
} from "@/firebase";
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
  CardDescription,
  CardFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  churchId?: string;
  name?: string;
}

interface SupportTicket {
  id?: string;
  subject: string;
  submittedByUid: string;
  submittedByName?: string;
  status: "Open" | "In Progress" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Critical";
  category?: "Access" | "Billing" | "Technical" | "Scheduling" | "Other";
  assignedToName?: string | null;
  createdAt: { seconds: number; nanoseconds: number } | any;
}

const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "destructive"> = {
  Low: "outline",
  Medium: "warning",
  High: "destructive",
  Critical: "destructive",
};

export default function AdminSupportPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SupportTicket["priority"]>("Medium");
  const [category, setCategory] = useState<SupportTicket["category"]>("Technical");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const churchTicketsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId) return null;
    return query(
      collection(firestore, "support_tickets"),
      where("churchId", "==", userProfile.churchId),
      orderBy("createdAt", "desc"),
    );
  }, [firestore, userProfile?.churchId]);

  const { data: tickets, isLoading: ticketsLoading } =
    useCollection<SupportTicket>(churchTicketsQuery);

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
    const ticketData = {
      subject: subject.trim(),
      description: description.trim(),
      submittedByUid: user.uid,
      submittedByName: user.displayName || user.email,
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
      case "Open": return "warning";
      case "In Progress": return "info";
      case "Closed": return "default";
      default: return "outline";
    }
  };

  const formatDate = (timestamp: SupportTicket["createdAt"]) => {
    if (!timestamp) return "N/A";
    if (timestamp.seconds) return format(new Date(timestamp.seconds * 1000), "MMM d, yyyy");
    return format(new Date(timestamp), "MMM d, yyyy");
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="mb-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <LifeBuoy className="h-8 w-8" />
          Admin Support
        </h1>
        <p className="text-muted-foreground mt-2">Manage support requests for your church.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Submit New Ticket</CardTitle>
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
                  placeholder="Describe the issue..."
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
              <CardTitle>Church Ticket History</CardTitle>
              <CardDescription>All tickets submitted by you or your volunteers.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticketsLoading && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Loading tickets...
                        </TableCell>
                      </TableRow>
                    )}
                    {!ticketsLoading && tickets?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No tickets found for your church.
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
                        <TableCell>{ticket.submittedByName || "Unknown"}</TableCell>
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
    </div>
  );
}
