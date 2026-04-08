
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, useAuth } from "@/firebase";
import { signInWithCustomToken } from "firebase/auth";
import { errorEmitter } from "@/firebase/error-emitter";
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { format } from "date-fns";
import {
  ArrowLeft,
  Send,
  User,
  Maximize2,
  Minimize2,
  X,
  Expand,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- TYPE DEFINITIONS ---
interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  submittedByUid: string;
  submittedByName: string;
  status: "Open" | "In Progress" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Critical";
  category?: "Access" | "Billing" | "Technical" | "Scheduling" | "Other";
  assignedToUid?: string | null;
  assignedToName?: string | null;
  createdAt: { seconds: number; nanoseconds: number } | any;
}
interface TicketComment {
  id: string;
  comment: string;
  commentByUid: string;
  commentByName: string;
  createdAt: { seconds: number; nanoseconds: number } | any;
}

const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "destructive"> = {
  Low: "outline",
  Medium: "warning",
  High: "destructive",
  Critical: "destructive",
};

// --- IMPERSONATION PANEL ---
type PanelSize = "side" | "wide" | "fullscreen";

function ImpersonationPanel({
  uid,
  name,
  onClose,
}: {
  uid: string;
  name: string;
  onClose: () => void;
}) {
  const [size, setSize] = useState<PanelSize>("side");

  const panelClass = cn(
    "fixed top-0 right-0 h-full bg-background border-l shadow-2xl z-50 flex flex-col transition-all duration-300",
    size === "side" && "w-[420px]",
    size === "wide" && "w-[680px]",
    size === "fullscreen" && "w-full",
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <div className={panelClass}>
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-semibold text-sm truncate">User Context: {name}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {size !== "side" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Collapse"
                onClick={() => setSize("side")}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
            {size === "side" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Expand"
                onClick={() => setSize("wide")}
              >
                <Expand className="h-4 w-4" />
              </Button>
            )}
            {size === "wide" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Full screen"
                onClick={() => setSize("fullscreen")}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Close"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* iframe */}
        <iframe
          src={`/user-frame/${uid}`}
          className="flex-1 w-full border-0"
          title={`User context for ${name}`}
        />
      </div>
    </>
  );
}

// --- MAIN COMPONENT ---
export default function TicketDetailsPage() {
  const { ticketId } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const auth = useAuth();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [showImpersonationPanel, setShowImpersonationPanel] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    if (!user) return;
    user.getIdTokenResult().then((tokenResult) => {
      setIsSuperUser(Boolean(tokenResult.claims.superUser));
    });
  }, [user]);

  // --- DATA FETCHING ---
  const ticketDocRef = useMemoFirebase(
    () => (firestore && ticketId ? doc(firestore, "support_tickets", ticketId as string) : null),
    [firestore, ticketId],
  );
  const {
    data: ticket,
    isLoading: ticketLoading,
    error: ticketError,
  } = useDoc<SupportTicket>(ticketDocRef);

  const commentsQuery = useMemoFirebase(
    () =>
      firestore && ticketId
        ? query(
            collection(firestore, `support_tickets/${ticketId}/comments`),
            orderBy("createdAt", "asc"),
          )
        : null,
    [firestore, ticketId],
  );
  const { data: comments, isLoading: commentsLoading } =
    useCollection<TicketComment>(commentsQuery);

  // --- HANDLERS ---
  const handleAddComment = async () => {
    if (!firestore || !user || !ticketId || !newComment.trim()) {
      toast.error("Cannot submit empty comment.");
      return;
    }

    setIsSubmitting(true);
    const commentData = {
      ticketId,
      comment: newComment.trim(),
      commentByUid: user.uid,
      commentByName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    };

    const commentsRef = collection(firestore, `support_tickets/${ticketId}/comments`);
    const ticketRef = doc(firestore, "support_tickets", ticketId as string);

    try {
      await Promise.all([
        addDoc(commentsRef, commentData),
        updateDoc(ticketRef, { lastActivityAt: serverTimestamp() }),
      ]);
      setNewComment("");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to add comment.");
      const permissionError = new FirestorePermissionError({
        path: commentsRef.path,
        operation: "create",
        requestResourceData: commentData,
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: SupportTicket["status"]) => {
    if (!ticketDocRef || !isSuperUser) {
      toast.error("You do not have permission to change the status.");
      return;
    }
    try {
      await updateDoc(ticketDocRef, { status: newStatus, lastActivityAt: serverTimestamp() });
      toast.success("Status updated.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status.");
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: ticketDocRef.path,
        operation: "update",
        requestResourceData: { status: newStatus },
      }));
    }
  };

  const handlePriorityChange = async (newPriority: SupportTicket["priority"]) => {
    if (!ticketDocRef || !isSuperUser) return;
    try {
      await updateDoc(ticketDocRef, { priority: newPriority, lastActivityAt: serverTimestamp() });
      toast.success("Priority updated.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update priority.");
    }
  };

  const handleAssignToMe = async () => {
    if (!ticketDocRef || !isSuperUser || !user) return;
    try {
      await updateDoc(ticketDocRef, {
        assignedToUid: user.uid,
        assignedToName: user.displayName || user.email,
        status: ticket?.status === "Open" ? "In Progress" : ticket?.status,
        lastActivityAt: serverTimestamp(),
      });
      toast.success("Ticket assigned to you.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to assign ticket.");
    }
  };

  const handleUnassign = async () => {
    if (!ticketDocRef || !isSuperUser) return;
    try {
      await updateDoc(ticketDocRef, {
        assignedToUid: null,
        assignedToName: null,
        lastActivityAt: serverTimestamp(),
      });
      toast.success("Ticket unassigned.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to unassign ticket.");
    }
  };

  const handleImpersonate = async () => {
    if (!auth || !user || !ticket) return;
    setIsImpersonating(true);
    const t = toast.loading(`Impersonating ${ticket.submittedByName}...`);
    try {
      const originalToken = await user.getIdToken();
      sessionStorage.setItem("original_user_session", JSON.stringify({ idToken: originalToken }));

      const res = await fetch("/api/auth/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: ticket.submittedByUid }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get impersonation token.");
      }
      const { customToken } = await res.json();
      await signInWithCustomToken(auth, customToken);
      sessionStorage.setItem("impersonation_active", ticket.submittedByName);
      const newIdToken = await auth.currentUser?.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: newIdToken }),
      });
      toast.success(`Now impersonating ${ticket.submittedByName}.`, { id: t });
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(`Impersonation failed: ${err.message}`, { id: t });
      sessionStorage.removeItem("original_user_session");
      setIsImpersonating(false);
    }
  };

  // --- RENDER HELPERS ---
  const getInitials = (name: string = "") => {
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0]?.[0] || ""}${names[names.length - 1]?.[0] || ""}`.toUpperCase();
    }
    return `${names[0]?.[0] || ""}`.toUpperCase();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return format(date, "MMM d, yyyy h:mm a");
  };

  const getStatusVariant = (status?: SupportTicket["status"]) => {
    switch (status) {
      case "Open": return "warning";
      case "In Progress": return "info";
      case "Closed": return "default";
      default: return "outline";
    }
  };

  if (ticketLoading) {
    return <div className="flex justify-center items-center h-screen">Loading ticket...</div>;
  }
  if (ticketError || !ticket) {
    return (
      <div className="flex justify-center items-center h-screen text-destructive">
        Error: Could not load ticket. You may not have permission to view it.
      </div>
    );
  }

  const isAssignedToMe = ticket.assignedToUid === user?.uid;

  return (
    <>
      <div className="flex flex-col items-center justify-start min-h-screen bg-muted/40 p-4 sm:p-8">
        <div className="w-full max-w-3xl">
          {/* Top nav */}
          <header className="mb-6 flex justify-between items-center gap-3 flex-wrap">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>

            {isSuperUser && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* View context panel */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImpersonationPanel(true)}
                  className="gap-2"
                >
                  <User className="h-4 w-4" />
                  View User Context
                </Button>

                {/* Full impersonation */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleImpersonate}
                  disabled={isImpersonating}
                  className="gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  {isImpersonating ? "Impersonating..." : "Impersonate"}
                </Button>

                {/* Assign to me / Unassign */}
                {isAssignedToMe ? (
                  <Button variant="outline" size="sm" onClick={handleUnassign}>
                    Unassign
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleAssignToMe}>
                    Assign to Me
                  </Button>
                )}

                {/* Priority */}
                <Select value={ticket.priority ?? ""} onValueChange={(v) => handlePriorityChange(v as SupportTicket["priority"])}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status */}
                <Select value={ticket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </header>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-2xl">{ticket.subject}</CardTitle>
                  <CardDescription className="mt-1">
                    Submitted by {ticket.submittedByName} on {formatDate(ticket.createdAt)}
                  </CardDescription>
                  {/* Metadata row */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                    {ticket.priority && (
                      <Badge variant={PRIORITY_VARIANT[ticket.priority] ?? "outline"}>
                        {ticket.priority}
                      </Badge>
                    )}
                    {ticket.category && (
                      <Badge variant="outline">{ticket.category}</Badge>
                    )}
                    {ticket.assignedToName && (
                      <span className="text-xs text-muted-foreground">
                        Assigned to <strong>{ticket.assignedToName}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Initial description */}
              <div className="flex gap-4 items-start">
                <Avatar>
                  <AvatarFallback>{getInitials(ticket.submittedByName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2 border rounded-md p-4 bg-background">
                  <p className="text-sm font-semibold">{ticket.submittedByName} wrote:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>
              </div>

              {/* Comments */}
              {commentsLoading && <p>Loading comments...</p>}
              {comments?.map((comment) => (
                <div
                  key={comment.id}
                  className={cn(
                    "flex gap-4 items-start",
                    comment.commentByUid === user?.uid && "flex-row-reverse",
                  )}
                >
                  <Avatar>
                    <AvatarFallback>{getInitials(comment.commentByName)}</AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "flex-1 space-y-2 border rounded-md p-4",
                      comment.commentByUid === user?.uid ? "bg-primary/5" : "bg-background",
                    )}
                  >
                    <p className="text-sm font-semibold">
                      {comment.commentByName}{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        at {formatDate(comment.createdAt)}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="pt-6 border-t">
              <div className="w-full space-y-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a reply..."
                  rows={4}
                />
                <Button onClick={handleAddComment} disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Add Comment
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Impersonation side panel */}
      {showImpersonationPanel && isSuperUser && ticket && (
        <ImpersonationPanel
          uid={ticket.submittedByUid}
          name={ticket.submittedByName}
          onClose={() => setShowImpersonationPanel(false)}
        />
      )}
    </>
  );
}
