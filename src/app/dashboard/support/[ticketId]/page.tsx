
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { format } from "date-fns";
import { ArrowLeft, Send } from "lucide-react";
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
  createdAt: { seconds: number; nanoseconds: number } | any;
}
interface TicketComment {
  id: string;
  comment: string;
  commentByUid: string;
  commentByName: string;
  createdAt: { seconds: number; nanoseconds: number } | any;
}
interface CurrentUser {
  isSuperUser?: boolean;
}

// --- MAIN COMPONENT ---
export default function TicketDetailsPage() {
  const { ticketId } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if current user is a super user
  const isSuperUser = user?.email === "joelerdman@gmail.com";

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
      // Use Promise.all to add comment and update ticket activity concurrently
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
      // Only super users can change status
      toast.error("You do not have permission to change the status.");
      return;
    }

    try {
      await updateDoc(ticketDocRef, { status: newStatus, lastActivityAt: serverTimestamp() });
      toast.success("Ticket status updated.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status.");
      const permissionError = new FirestorePermissionError({
        path: ticketDocRef.path,
        operation: "update",
        requestResourceData: { status: newStatus },
      });
      errorEmitter.emit("permission-error", permissionError);
    }
  };

  // --- RENDER LOGIC ---
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
      case "Open":
        return "destructive";
      case "In Progress":
        return "secondary";
      case "Closed":
        return "default";
      default:
        return "outline";
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

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-muted/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl">
        <header className="mb-6 flex justify-between items-center">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
          {isSuperUser && (
            <Select value={ticket.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          )}
        </header>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{ticket.subject}</CardTitle>
                <CardDescription className="mt-1">
                  Submitted by {ticket.submittedByName} on {formatDate(ticket.createdAt)}
                </CardDescription>
              </div>
              <Badge variant={getStatusVariant(ticket.status)} className="h-fit">
                {ticket.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Initial Ticket Description */}
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
                    {" "}
                    <Send className="mr-2 h-4 w-4" /> Add Comment{" "}
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
