"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFirestore, useUser } from "@/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  Timestamp,
  doc,
  writeBatch,
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
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, Search, SlidersHorizontal, CheckSquare } from "lucide-react";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface SupportTicket {
  id: string;
  subject: string;
  submittedByName: string;
  submittedByUid: string;
  churchId: string;
  status: "Open" | "In Progress" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Critical";
  category?: "Access" | "Billing" | "Technical" | "Scheduling" | "Other";
  assignedToName?: string | null;
  createdAt: Timestamp | any;
}

const STATUSES = ["All", "Open", "In Progress", "Closed"] as const;
type StatusFilter = (typeof STATUSES)[number];

const CATEGORIES = ["All", "Access", "Billing", "Technical", "Scheduling", "Other"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

const STATUS_VARIANT: Record<string, "warning" | "secondary" | "default" | "outline"> = {
  Open: "warning",
  "In Progress": "info",
  Closed: "default",
};

const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "destructive"> = {
  Low: "outline",
  Medium: "warning",
  High: "destructive",
  Critical: "destructive",
};

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  "": 4,
};

export default function SuperUserTicketsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const fetchTickets = () => {
    if (!firestore) return;
    setIsLoading(true);
    getDocs(query(collection(firestore, "support_tickets"), orderBy("createdAt", "desc")))
      .then((snap) => setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket))))
      .catch(() => toast.error("Could not fetch support tickets."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchTickets(); }, [firestore]);

  const filtered = useMemo(() => {
    return tickets
      .filter((t) => {
        const matchesStatus = statusFilter === "All" || t.status === statusFilter;
        const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
        const matchesSearch =
          !search ||
          t.subject.toLowerCase().includes(search.toLowerCase()) ||
          t.submittedByName?.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority ?? ""] ?? 4;
        const pb = PRIORITY_ORDER[b.priority ?? ""] ?? 4;
        return pa - pb;
      });
  }, [tickets, statusFilter, categoryFilter, search]);

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

  // --- Selection ---
  const allFilteredIds = filtered.map((t) => t.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Bulk Operations ---
  const bulkUpdateStatus = async (newStatus: SupportTicket["status"]) => {
    if (!firestore || selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const batch = writeBatch(firestore);
      selectedIds.forEach((id) => {
        batch.update(doc(firestore, "support_tickets", id), { status: newStatus });
      });
      await batch.commit();
      setTickets((prev) =>
        prev.map((t) => (selectedIds.has(t.id) ? { ...t, status: newStatus } : t)),
      );
      toast.success(`${selectedIds.size} ticket(s) marked as "${newStatus}".`);
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      toast.error("Bulk update failed.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const bulkAssignToMe = async () => {
    if (!firestore || !user || selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const batch = writeBatch(firestore);
      const name = user.displayName || user.email || "Me";
      selectedIds.forEach((id) => {
        batch.update(doc(firestore, "support_tickets", id), {
          assignedToUid: user.uid,
          assignedToName: name,
        });
      });
      await batch.commit();
      setTickets((prev) =>
        prev.map((t) =>
          selectedIds.has(t.id)
            ? { ...t, assignedToUid: user.uid, assignedToName: name }
            : t,
        ),
      );
      toast.success(`${selectedIds.size} ticket(s) assigned to you.`);
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      toast.error("Bulk assign failed.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground">View and respond to support tickets from all users.</p>
      </header>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
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

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
          <SelectTrigger className="w-[160px] h-9">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c === "All" ? "All Categories" : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Ticket Queue</CardTitle>
              <CardDescription>
                {isLoading ? "Loading..." : `Showing ${filtered.length} of ${tickets.length} tickets.`}
              </CardDescription>
            </div>

            {/* Bulk actions */}
            {someSelected && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isBulkUpdating} className="gap-2">
                      {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => bulkUpdateStatus("Open")}>Mark Open</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdateStatus("In Progress")}>Mark In Progress</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdateStatus("Closed")}>Mark Closed</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={bulkAssignToMe}>Assign to Me</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedIds(new Set())} className="text-muted-foreground">
                      Clear Selection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

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
          <div className="border rounded-lg overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No tickets match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className={cn(selectedIds.has(ticket.id) && "bg-muted/40")}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(ticket.id)}
                          onCheckedChange={() => toggleSelect(ticket.id)}
                          aria-label={`Select ticket ${ticket.subject}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="truncate">{ticket.subject}</div>
                        {ticket.category && (
                          <div className="text-xs text-muted-foreground">{ticket.category}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{ticket.submittedByName}</TableCell>
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
                        <Badge variant={STATUS_VARIANT[ticket.status] ?? "outline"}>{ticket.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ticket.assignedToName ?? <span className="text-xs">Unassigned</span>}
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
