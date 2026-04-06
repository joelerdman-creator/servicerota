
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFirestore } from "@/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentSnapshot,
  QueryConstraint,
} from "firebase/firestore";
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
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface SupportTicket {
  id: string;
  subject: string;
  submittedByName: string;
  churchId: string;
  status: "Open" | "In Progress" | "Closed";
  createdAt: { seconds: number; nanoseconds: number } | any; // Firestore Timestamp
}

const PAGE_SIZE = 25;

export default function SuperUserTicketsPage() {
  const firestore = useFirestore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchTickets(true);
  }, [firestore]);

  const fetchTickets = async (initial = false) => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(PAGE_SIZE)];
      if (!initial && lastVisible) {
        constraints.push(startAfter(lastVisible));
      }

      const q = query(collection(firestore, "support_tickets"), ...constraints);
      const querySnapshot = await getDocs(q);

      const fetchedTickets = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as SupportTicket,
      );

      setTickets(initial ? fetchedTickets : (prev) => [...prev, ...fetchedTickets]);
      setHasMore(fetchedTickets.length === PAGE_SIZE);

      const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(newLastVisible || null);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Could not fetch support tickets.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusVariant = (status: SupportTicket["status"]) => {
    switch (status) {
      case "Open":
        return "warning";
      case "In Progress":
        return "secondary";
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

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground">View and respond to support tickets from all users.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Ticket Queue</CardTitle>
          <CardDescription>
            {isLoading && tickets.length === 0 ? "Loading tickets..." : `Showing ${tickets.length} tickets.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.subject}</TableCell>
                    <TableCell>{ticket.submittedByName}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/support/${ticket.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                        View <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && tickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No support tickets found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {hasMore && !isLoading && (
             <div className="mt-4 flex justify-center">
                <Button onClick={() => fetchTickets(false)} disabled={isLoading}>
                    {isLoading ? "Loading..." : "Load More"}
                </Button>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
