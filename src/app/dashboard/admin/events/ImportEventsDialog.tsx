"use client";

import { useState, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { ParsedEvent, DateRange, UserProfile } from "./types";

interface ImportEventsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  firestore: Firestore;
  userProfile: UserProfile;
  defaultCalendarUrl?: string;
}

export function ImportEventsDialog({
  isOpen,
  onClose,
  firestore,
  userProfile,
  defaultCalendarUrl,
}: ImportEventsDialogProps) {
  const [calendarUrl, setCalendarUrl] = useState(defaultCalendarUrl || "");
  const [importDateRange, setImportDateRange] = useState<DateRange | undefined>();
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [importStep, setImportStep] = useState<"form" | "review">("form");
  const [eventsToReview, setEventsToReview] = useState<ParsedEvent[]>([]);
  const [selectedEventIndexes, setSelectedEventIndexes] = useState<Set<number>>(new Set());
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);

  const selectedEventsToImport = useMemo(() => {
    return eventsToReview.filter((_, index) => selectedEventIndexes.has(index));
  }, [eventsToReview, selectedEventIndexes]);

  const reset = () => {
    setImportStep("form");
    setEventsToReview([]);
    setSelectedEventIndexes(new Set());
    setImportDateRange(undefined);
    setCalendarUrl(defaultCalendarUrl || "");
    onClose();
  };

  const handleGeneratePreview = async () => {
    if (!calendarUrl) {
      toast.error("Please enter a calendar URL.");
      return;
    }
    setIsGeneratingPreview(true);
    try {
      const apiUrl = new URLSearchParams({ url: calendarUrl });
      if (importDateRange?.from) apiUrl.set("from", importDateRange.from.toISOString());
      if (importDateRange?.to) apiUrl.set("to", importDateRange.to.toISOString());

      const response = await fetch(`/api/import-calendar?${apiUrl.toString()}`);
      const result = (await response.json()) as { message: string; events: ParsedEvent[] };
      if (!response.ok) throw new Error(result.message || "Failed to fetch calendar data.");

      toast.success(result.message);
      setEventsToReview(result.events);
      setSelectedEventIndexes(new Set(result.events.map((_, i) => i)));
      setImportStep("review");
    } catch (error: unknown) {
      toast.error((error as Error).message || "An error occurred.");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const toggleAllSelectedEvents = (checked: boolean) => {
    setSelectedEventIndexes(checked ? new Set(eventsToReview.map((_, i) => i)) : new Set());
  };

  const toggleSelectedEvent = (index: number) => {
    const newSet = new Set(selectedEventIndexes);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedEventIndexes(newSet);
  };

  const handleConfirmImport = async () => {
    if (!userProfile?.churchId || selectedEventsToImport.length === 0) {
      toast.error("No events selected to import or database not available.");
      return;
    }
    setIsConfirmingImport(true);
    try {
      const batch = writeBatch(firestore);
      const eventsCollectionRef = collection(firestore, `churches/${userProfile.churchId}/events`);
      for (const event of selectedEventsToImport) {
        const newEventRef = doc(eventsCollectionRef);
        batch.set(newEventRef, {
          ...event,
          eventType: "Service",
          churchId: userProfile.churchId,
          isPublished: false,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      const count = selectedEventsToImport.length;
      toast.success(`${count} event${count > 1 ? "s" : ""} imported successfully!`);
      reset();
    } catch (err) {
      console.error("Final Import Client Error:", err);
      toast.error("An error occurred while saving events to the database.");
    } finally {
      setIsConfirmingImport(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && reset()}>
      <DialogContent className={importStep === "review" ? "max-w-3xl" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle>Import Events</DialogTitle>
          <DialogDescription>
            {importStep === "form"
              ? "Import from a public calendar URL within a specific date range."
              : "Select the events you want to import."}
          </DialogDescription>
        </DialogHeader>

        {importStep === "form" ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gcal-id">Public Calendar URL (.ics)</Label>
              <Input
                id="gcal-id"
                name="url"
                type="url"
                placeholder="https://calendar.google.com/..."
                value={calendarUrl}
                onChange={(e) => setCalendarUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                This can be saved in your church settings to be used by default.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-date-range">Date Range (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="import-date-range"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !importDateRange && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {importDateRange?.from ? (
                      importDateRange.to ? (
                        <>
                          {format(importDateRange.from, "LLL dd, y")} -{" "}
                          {format(importDateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(importDateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={importDateRange?.from}
                    selected={importDateRange}
                    onSelect={setImportDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Only import events that fall within this range.
              </p>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button
                onClick={handleGeneratePreview}
                disabled={!calendarUrl || isGeneratingPreview || !userProfile?.churchId}
              >
                {isGeneratingPreview ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                  </>
                ) : (
                  "Generate Preview"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="max-h-[50vh] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox
                        checked={
                          selectedEventIndexes.size === eventsToReview.length &&
                          eventsToReview.length > 0
                        }
                        onCheckedChange={(checked) => toggleAllSelectedEvents(Boolean(checked))}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Event Name</TableHead>
                    <TableHead className="w-[200px]">Date &amp; Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsToReview.length > 0 ? (
                    eventsToReview.map((event, index) => (
                      <TableRow
                        key={index}
                        data-state={selectedEventIndexes.has(index) && "selected"}
                        className="cursor-pointer"
                        onClick={() => toggleSelectedEvent(index)}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedEventIndexes.has(index)}
                            onCheckedChange={() => toggleSelectedEvent(index)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{event.eventName}</TableCell>
                        <TableCell>
                          {format(new Date(event.eventDate), "MMM d, yyyy @ h:mm a")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        No upcoming events found in the calendar for the selected range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportStep("form")}>
                Back
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={selectedEventsToImport.length === 0 || isConfirmingImport}
              >
                {isConfirmingImport ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...
                  </>
                ) : (
                  `Import ${selectedEventsToImport.length} Event(s)`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
