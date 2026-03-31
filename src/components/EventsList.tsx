"use client";

import { WithId } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Repeat } from "lucide-react";
import { format } from "date-fns";

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
        {isLoading && <p className="text-muted-foreground text-sm">Loading...</p>}
        {!isLoading && events?.length === 0 && (
          <p className="text-muted-foreground">No events for this selection.</p>
        )}
        {events?.map((event) => (
          <div
            key={event.id}
            className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onEventClick(event)}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="font-bold">{event.eventName}</span>
                  <span className="text-muted-foreground font-normal">
                    {" — "}
                    {format(new Date(event.eventDate), "EEE MMM d, yyyy")}
                    <span className="text-xs ml-1">
                      {format(new Date(event.eventDate), "h:mm a")}
                    </span>
                  </span>
                </div>
                {event.seriesId && (
                  <Repeat className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Recurring Event" />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {event.eventType && (
                  <Badge variant={event.eventType === "Service" ? "default" : "secondary"}>
                    {event.eventType}
                  </Badge>
                )}
                <Badge variant={event.isPublished ? "default" : "secondary"}>
                  {event.isPublished ? "Published" : "Draft"}
                </Badge>
                <Badge variant="outline">Manage</Badge>
              </div>
            </div>
            {event.notes && <p className="text-sm mt-2 text-muted-foreground">{event.notes}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
