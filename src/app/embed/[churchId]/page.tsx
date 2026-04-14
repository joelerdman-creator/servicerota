
// This is a new public-facing page for the embeddable widget.
// It is intentionally simple and does not use the main app layout.
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useCollection, useDoc, useFirestore, useMemoFirebase, WithId, FirebaseClientProvider } from "@/firebase";
import { collection, doc, query, where, orderBy, getDoc, getDocs } from "firebase/firestore";
import { useParams, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Church } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

// --- TYPE DEFINITIONS ---
interface Church {
  name: string;
  logoUrl?: string;
}
interface Event {
  eventName: string;
  eventDate: string; // ISO String
  isPublished?: boolean; // Optional now
  churchId: string;
}
interface Role {
  roleName: string;
  assignedVolunteerName?: string;
}
interface EventWithRoles extends WithId<Event> {
  roles: WithId<Role>[];
}

// --- Main Page Component ---
function EmbeddedSchedulePage() {
  const firestore = useFirestore();
  const params = useParams();
  const searchParams = useSearchParams();

  const churchId = params.churchId as string;
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  // Header & Style Params
  const noHeader = searchParams.get("noheader") === "true";
  const noLogo = searchParams.get("nologo") === "true";
  const title = searchParams.get("title");
  const description = searchParams.get("desc");
  const primaryColor = searchParams.get("primaryColor");
  const textColor = searchParams.get("textColor");
  const bgColor = searchParams.get("bgColor");
  const fontFamily = searchParams.get("fontFamily");

  const [eventsWithRoles, setEventsWithRoles] = useState<EventWithRoles[]>([]);
  const [church, setChurch] = useState<Church | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !churchId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch Church Info
        const churchRef = doc(firestore, "churches", churchId);
        const churchSnap = await getDoc(churchRef);
        if (churchSnap.exists()) {
          setChurch(churchSnap.data() as Church);
        }

        const queryConstraints: any[] = [
          // Use any[] to allow conditional push
          where("isPublished", "==", true),
          orderBy("eventDate"),
        ];

        if (fromDate) {
          queryConstraints.push(
            where("eventDate", ">=", new Date(fromDate + "T00:00:00").toISOString()),
          );
        }
        if (toDate) {
          queryConstraints.push(
            where("eventDate", "<=", new Date(toDate + "T23:59:59").toISOString()),
          );
        }

        const eventsRef = collection(firestore, `churches/${churchId}/events`);
        const eventsQuery = query(
          eventsRef,
          ...queryConstraints.filter(
            (c) => c.type !== "where" || c._field.toString() !== "churchId",
          ),
        );

        const eventsSnap = await getDocs(eventsQuery);
        const fetchedEvents = eventsSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as WithId<Event>,
        );

        const eventsWithRolesData: EventWithRoles[] = await Promise.all(
          fetchedEvents.map(async (event) => {
            const rolesQuery = query(
              collection(firestore, `churches/${churchId}/events/${event.id}/roles`),
            );
            const rolesSnap = await getDocs(rolesQuery);
            const roles = rolesSnap.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() }) as WithId<Role>,
            );
            return { ...event, roles };
          }),
        );

        setEventsWithRoles(eventsWithRolesData);
      } catch (err: any) {
        console.error("Error fetching embed data:", err);
        setError(err.message || "Could not load schedule.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, churchId, fromDate, toDate]);

  // Create inline styles from URL params
  const dynamicStyles = useMemo(() => {
    const styles: React.CSSProperties & { [key: string]: string } = {};
    if (bgColor) styles["--widget-bg-color"] = `#${bgColor}`;
    if (textColor) {
      styles["--widget-text-color"] = `#${textColor}`;
      // Auto-calculate secondary color with 70% opacity
      const hex =
        textColor.length === 3
          ? textColor
              .split("")
              .map((c) => c + c)
              .join("")
          : textColor;
      styles["--widget-secondary-text-color"] = `#${hex}b3`; // b3 is ~70% opacity in hex
    }
    if (primaryColor) styles["--widget-primary-color"] = `#${primaryColor}`;
    if (fontFamily) styles["fontFamily"] = fontFamily;
    return styles;
  }, [bgColor, textColor, primaryColor, fontFamily]);

  return (
    <>
      {fontFamily && (
        <style>
          {`@import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@400;600;700&display=swap');`}
        </style>
      )}
      <div
        className="bg-[var(--widget-bg-color,white)] text-[var(--widget-text-color,#333)] font-sans p-4 sm:p-6 w-full h-full overflow-y-auto"
        style={dynamicStyles}
      >
        {!noHeader && (
          <header className="flex items-center gap-4 border-b border-b-[var(--widget-primary-color,black)]/20 pb-4 mb-6">
            {church?.logoUrl && !noLogo && (
              <Image
                src={church.logoUrl}
                alt={`${church.name} Logo`}
                width={40}
                height={40}
                className="rounded-md object-contain"
              />
            )}
            {!church?.logoUrl && !noLogo && (
              <Church className="h-7 w-7 text-[var(--widget-primary-color)]" />
            )}
            <div>
              <h1 className="text-xl font-bold text-[var(--widget-text-color,#111)]">
                {title || church?.name || "Volunteer Schedule"}
              </h1>
              <p className="text-sm text-[var(--widget-secondary-text-color)]">
                {description || "Upcoming Assignments"}
              </p>
            </div>
          </header>
        )}

        {isLoading && <p>Loading schedule...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!isLoading && !error && (
          <div className="space-y-6">
            {eventsWithRoles.length > 0 ? (
              eventsWithRoles.map((event) => (
                <div key={event.id}>
                  <h2 className="font-bold text-lg border-b border-b-[var(--widget-primary-color,black)]/20 pb-1 mb-2">
                    {format(new Date(event.eventDate), "eeee, MMMM do, yyyy")}
                  </h2>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-[var(--widget-primary-color)]">
                      {event.eventName}
                      <span className="text-[var(--widget-secondary-text-color)] font-normal text-sm ml-2">
                        @ {format(new Date(event.eventDate), "p")}
                      </span>
                    </h3>
                    <div className="pl-4 space-y-1">
                      {event.roles.length > 0 ? (
                        event.roles.map((role) => (
                          <p key={role.id} className="text-sm">
                            <span className="font-medium w-32 inline-block">{role.roleName}:</span>
                            <span className="text-[var(--widget-secondary-text-color)]">
                              {role.assignedVolunteerName || "Open"}
                            </span>
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--widget-secondary-text-color)] italic">
                          No roles for this event.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-[var(--widget-secondary-text-color)]">
                  No published events in this date range.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// A wrapper component to provide the Firebase context to the embed page
export default function EmbeddedScheduleProviderWrapper() {
  return (
    <FirebaseClientProvider>
      <Suspense fallback={null}>
        <EmbeddedSchedulePage />
      </Suspense>
    </FirebaseClientProvider>
  );
}
