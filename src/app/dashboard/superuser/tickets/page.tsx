"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFirestore } from "@/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  Timestamp,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";

interface SupportTicket {
  id: string;
  subject: string;
  submittedByName: string;
  churchId: string;
  status: "Open" | "In Progress" | "Closed";
  createdAt: Timestamp | any;
}

const STATUSES = ["All", "Open", "In Progress", "Closed"] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_VARIANT: Record<string, "warning" | "secondary" | "default" | "outline"> = {
  Open: "warning",
  "In Progress": "secondary",
  Closed: "default",
};

export default function SuperUserTicketsPage() {
  const firestore = useFirestore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  useEffect(() => {
    if (!firestore) return;
    getDocs(query(collection(firestore, "support_tickets"), orderBy("createdAt", "desc")))
      .then((snap) => setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket))))
      .catch(() => toast.error("Could not fetch support tickets."))
      .finally(() => setIsLoading(false));
  }, [firestore]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus = statusFilter === "All" || t.status === statusFilter;
      const matchesSearch =
        !search ||
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.submittedByName?.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [tickets, statusFilter, search]);

  const counts = useMemo(
    () => ({
      All: tickets.length,
      Open: tickets.filter((t) => t.status === "Open").length,
      "In Progress": tickets.filter((t) => t.status === "In Progress").length,
      Closed: tickets.filter((t) => t.status === "Closed").length,
    }),
    [tickets],
  );

  const formatDate = (ts: SupportTicket["createdAt"]) => {
    if (!ts) return "N/A";
    const ms = ts.seconds ? ts.seconds * 1000 : new Date(ts).getTime();
    return format(new Date(ms), "MMM d, yyyy");
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground">View and respond to support tickets from all users.</p>
      </header>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="gap-2"
          >
            {s}
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-xs font-bold",
              statusFilter === s ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {counts[s]}
            </span>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Queue</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `Showing ${filtered.length} of ${tickets.length} tickets.`}
          </CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject or submitter..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No tickets match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium max-w-[240px] truncate">{ticket.subject}</TableCell>
                      <TableCell>{ticket.submittedByName}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[ticket.status] ?? "outline"}>{ticket.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/support/${ticket.id}`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          View <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
