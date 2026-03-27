
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useFirestore,
  WithId,
  useMemoFirebase,
  useUser,
  useDoc,
  errorEmitter,
} from "@/firebase";
import {
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  Trash2,
  Repeat,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Event {
  eventName: string;
  eventDate: string; // ISO string
  notes?: string;
  churchId: string;
  isPublished?: boolean;
  eventType?: "Service" | "Generic Event";
  isSignupEnabled?: boolean;
  signupScope?: "all_roles" | "unassigned_only";
  signupRequiresQualification?: boolean;
  seriesId?: string;
}

interface EventsListProps {
    events: WithId<Event>[];
    isLoading: boolean;
    title: string;
    onEventClick: (event: WithId<Event>) => void;
}


export default function EventsList({ events, isLoading, title, onEventClick }: EventsListProps) {
  
  return (
      <Card className="flex-1 min-w-[200px] border-brand-accent/20">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p>Loading...</p>}
          {!isLoading && events?.length === 0 && (<p className="text-muted-foreground">No events for this selection.</p>)}
          {events?.map((event) => (
            <div key={event.id} className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onEventClick(event)}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold">{event.eventName} - <span className="font-normal text-muted-foreground">{format(new Date(event.eventDate), "MMM d, yyyy")}</span></h2>
                  {event.seriesId && <Repeat className="h-4 w-4 text-muted-foreground" aria-label="Recurring Event" />}
                </div>
                <div className="flex items-center gap-2">
                  {event.eventType && <Badge variant={event.eventType === 'Service' ? 'default' : 'secondary'}>{event.eventType}</Badge>}
                  <Badge variant={event.isPublished ? "default" : "secondary"}>{event.isPublished ? "Published" : "Draft"}</Badge>
                  <Badge variant="outline">Manage</Badge>
                </div>
              </div>
              {event.notes && <p className="text-sm mt-2">{event.notes}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
  );
}
