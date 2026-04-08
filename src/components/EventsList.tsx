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
            className="px-4 py-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onEventClick(event)}
          >
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold truncate">{event.eventName}</span>
                <span className="text-muted-foreground text-sm whitespace-nowrap hidden sm:inline">
                  {format(new Date(event.eventDate), "EEE MMM d")}
                  <span className="text-xs ml-1 text-muted-foreground/70">
                    {format(new Date(event.eventDate), "h:mm a")}
                  </span>
                </span>
                {event.seriesId && (
                  <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-label="Recurring" />
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {event.eventType && event.eventType !== "Service" && (
                  <Badge variant="secondary" className="text-xs">{event.eventType}</Badge>
                )}
                <Badge
                  variant={event.isPublished ? "default" : "outline"}
                  className="text-xs"
                >
                  {event.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
            </div>
            {/* Mobile date fallback */}
            <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">
              {format(new Date(event.eventDate), "EEE MMM d, yyyy 'at' h:mm a")}
            </p>
            {event.notes && <p className="text-sm mt-1.5 text-muted-foreground">{event.notes}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
