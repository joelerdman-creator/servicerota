
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useUser, useDoc, useCollection, WithId, useMemoFirebase } from "@/firebase";
import { doc, collection, query, orderBy, getDocs, where, limit } from "firebase/firestore";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon,
  Copy,
  Clipboard,
  Download,
  Printer,
  CheckSquare,
  Square,
  Church,
  Loader2,
  Bell,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { useSubscription } from "@/lib/hooks/use-subscription";
import { UpgradeGate } from "@/components/UpgradeGate";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import ReactQRCode from "react-qr-code";
import Image from "next/image";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// --- TYPE DEFINITIONS & CONSTANTS ---
const FLYER_WIDTH_PX = 816; // 8.5in * 96dpi
const FLYER_HEIGHT_PX = 1056; // 11in * 96dpi
const FLYER_ASPECT_RATIO = FLYER_WIDTH_PX / FLYER_HEIGHT_PX;

const flyerStyles = `
    .flyer-body {
        width: ${FLYER_WIDTH_PX}px;
        height: ${FLYER_HEIGHT_PX}px;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        background-color: white;
        font-family: 'Poppins', sans-serif;
        color: #333;
        overflow: hidden;
    }
    .flyer-top-image-container { width: 100%; height: 240px; /* 2.5in * 96dpi */ overflow: hidden; background-color: #f0f0f0; }
    .flyer-top-image { width: 100%; height: 100%; object-fit: cover; }
    .flyer-content-wrapper { padding: 48px 72px 72px; flex-grow: 1; display: flex; flex-direction: column; text-align: center; }
    .flyer-header { 
        display: flex; 
        align-items: stretch; 
        justify-content: center; 
        gap: 1.5rem; 
        margin-bottom: 1.25rem; 
    }
    .flyer-logo-container { 
        flex-shrink: 0; 
        width: 60px; 
        display: flex; 
        flex-direction: column; 
        justify-content: center; 
        align-items: center;
    }
    .flyer-logo-image { 
        width: 100%; 
        height: auto; 
        max-height: 60px; 
        object-fit: contain; 
    }
    .flyer-header-text { 
        text-align: left; 
        display: flex; 
        flex-direction: column; 
        justify-content: center; 
    }
    .flyer-header-text h1 { 
        font-size: 44pt; 
        font-weight: 700; 
        /* color set inline via primaryColor prop */
        margin: 0; 
        line-height: 1; 
    }
    .flyer-header-text p { 
        font-size: 16pt; 
        margin: 0.25rem 0 0; 
        color: #555; 
        line-height: 1.2; 
    }
    .flyer-main-content { flex-grow: 1; }
    .flyer-main-content .intro { text-align: center; font-size: 14pt; margin: 1rem 0 1.5rem; line-height: 1.6; }
    .flyer-main-content h2 { font-size: 22pt; font-weight: 600; text-align: center; margin: 0 0 1.25rem; }
    .flyer-roles-container { display: inline-block; }
    .flyer-roles { column-count: 2; column-gap: 2.5rem; list-style-position: inside; padding-left: 0; margin: 0; text-align: left; }
    .flyer-roles li { font-size: 14pt; margin-bottom: 0.6rem; break-inside: avoid-column; }
    .flyer-footer { margin-top: auto; padding-top: 1.5rem; border-top: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; gap: 2rem; }
    .qr-info { text-align: left; }
    .qr-info h3 { font-size: 20pt; margin: 0 0 0.5rem; font-weight: 700; }
    .qr-info p { font-size: 12pt; margin: 0; }
    .qr-code { border: 5px solid #16a34a; border-radius: 8px; padding: 10px; background: white; }
    .web-address { text-align: center; margin-top: 1rem; font-weight: 600; font-size: 11pt; letter-spacing: 0.5px; }
`;

interface UserProfile {
  churchId?: string;
  name?: string;
}
interface ChurchProfile {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  fontFamily?: string;
  denomination?: string;
}
interface Event {
  eventName: string;
  eventDate: string;
  isPublished?: boolean;
}
interface Role {
  roleName: string;
  assignedVolunteerName?: string;
}
interface EventWithRoles extends WithId<Event> {
  roles: WithId<Role>[];
}
interface RoleTemplate {
  id: string;
  name: string;
}
interface ScheduleRow {
  date: string;
  time: string;
  event: string;
  role: string;
  volunteer: string;
}

const googleFonts = [
  { name: "Inter", value: "Inter" },
  { name: "Lato", value: "Lato" },
  { name: "Merriweather", value: "Merriweather" },
  { name: "Open Sans", value: "Open Sans" },
  { name: "Poppins", value: "Poppins" },
  { name: "Roboto", value: "Roboto" },
  { name: "Source Sans Pro", value: "Source Sans Pro" },
];

const FlyerContent = ({
  churchProfile,
  selectedRoles,
  signupUrl,
  logoDataUrl,
  primaryColor,
  fontFamily,
  flyerImageUrl,
  defaultHeroImageUrl,
}: {
  churchProfile: ChurchProfile | null;
  selectedRoles: Set<string>;
  signupUrl: string;
  logoDataUrl?: string;
  primaryColor: string;
  fontFamily: string;
  flyerImageUrl?: string;
  defaultHeroImageUrl?: string;
}) => {
  const activeHeroImage = flyerImageUrl || defaultHeroImageUrl;
  return (
  <div className="flyer-body" style={{ fontFamily }}>
    <div className="flyer-top-image-container">
      {activeHeroImage ? (
        <img
          src={activeHeroImage}
          alt="Church community hero image"
          className="flyer-top-image"
        />
      ) : (
        <div className="flyer-top-image" style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${primaryColor}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '24pt', color: primaryColor, fontWeight: 600, opacity: 0.7 }}>Upload a Hero Image</span>
        </div>
      )}
    </div>
    <div className="flyer-content-wrapper">
      <div className="flyer-header">
        {logoDataUrl && (
          <div className="flyer-logo-container">
            <img
              src={logoDataUrl}
              alt={`${churchProfile?.name || ""} Logo`}
              className="flyer-logo-image"
            />
          </div>
        )}
        <div className="flyer-header-text">
          <h1 style={{ color: primaryColor }}>Serve With Us</h1>
          <p>{churchProfile?.name || "Our Church Community"}</p>
        </div>
      </div>
      <div className="flyer-main-content">
        <p className="intro">
          Join a dedicated team and use your time and talents to serve our community. We have a
          place for everyone!
        </p>
        <h2>Open Volunteer Roles</h2>
        <div className="flyer-roles-container">
          <ul className="flyer-roles">
            {Array.from(selectedRoles)
              .slice(0, 10)
              .map((roleName) => (
                <li key={roleName}>{roleName}</li>
              ))}
            {selectedRoles.size > 10 && <li>And more...</li>}
          </ul>
        </div>
      </div>
      <div className="flyer-footer">
        <div className="qr-code" style={{ borderColor: primaryColor }}>
          <ReactQRCode value={signupUrl} size={110} bgColor="#ffffff" fgColor="#000000" />
        </div>
        <div className="qr-info">
          <h3>Ready to Join?</h3>
          <p>
            Scan the code with your
            <br />
            phone's camera to sign up!
          </p>
        </div>
      </div>
      <p className="web-address">{signupUrl.replace(/^https?:\/\//, "")}</p>
    </div>
  </div>
  );
};

function NotificationsTab() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user, firestore],
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId) return null;
    return query(
      collection(firestore, `churches/${userProfile.churchId}/notifications`),
      orderBy("sentAt", "desc"),
      limit(50),
    );
  }, [firestore, userProfile?.churchId]);

  const { data: notifications, isLoading } = useCollection<{
    recipientEmail: string;
    subject: string;
    sentAt: { seconds: number; nanoseconds: number } | any;
    status: "Sent" | "Failed";
    type: string;
  }>(notificationsQuery);

  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | any) => {
    if (!timestamp) return "N/A";
    if (timestamp.seconds) {
      return format(new Date(timestamp.seconds * 1000), "MMM d, yyyy h:mm a");
    }
    try {
      return format(new Date(timestamp), "MMM d, yyyy h:mm a");
    } catch {
      return "Just now";
    }
  };

  const getStatusVariant = (status: "Sent" | "Failed") => {
    switch (status) {
      case "Sent":
        return "default";
      case "Failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="border-brand-accent/20">
      <CardHeader>
        <CardTitle>Email History</CardTitle>
        <CardDescription>
          Showing the last 50 notifications sent. This list updates in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && notifications?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Bell className="h-10 w-10" />
                      <p className="font-semibold">No notifications found.</p>
                      <p className="text-sm">Emails you send will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {notifications?.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell className="font-medium">{notification.recipientEmail}</TableCell>
                  <TableCell>{notification.subject}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{notification.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(notification.status)}>
                      {notification.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(notification.sentAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


export default function SharingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { canUse } = useSubscription();

  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>();

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width } = entries[0].contentRect;
        if (width > 0) {
          // Scale only to width — wrapper height is set dynamically so full flyer always shows
          setScaleFactor((width / FLYER_WIDTH_PX) * 0.99);
        }
      }
    });
    if (previewWrapperRef.current) resizeObserver.observe(previewWrapperRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const [eventsWithRoles, setEventsWithRoles] = useState<EventWithRoles[]>([]);
  const [bulletinDateRange, setBulletinDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [scheduleDateRange, setScheduleDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [widgetDateRange, setWidgetDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [widgetShowHeader, setWidgetShowHeader] = useState(true);
  const [widgetShowLogo, setWidgetShowLogo] = useState(true);
  const [widgetTitle, setWidgetTitle] = useState("");
  const [widgetDescription, setWidgetDescription] = useState("Upcoming Assignments");
  const [widgetPrimaryColor, setWidgetPrimaryColor] = useState("#103f83");
  const [widgetTextColor, setWidgetTextColor] = useState("#333333");
  const [widgetBgColor, setWidgetBgColor] = useState("#ffffff");
  const [widgetFont, setWidgetFont] = useState("Inter");
  const [baseUrl, setBaseUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFlyerRoles, setSelectedFlyerRoles] = useState<Set<string>>(new Set());
  const [flyerImageUrl, setFlyerImageUrl] = useState<string | undefined>();
  const [selectedStockImageUrl, setSelectedStockImageUrl] = useState<string | undefined>();

  const handleFlyerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFlyerImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => setBaseUrl(window.location.origin), []);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null), [user, firestore]),
  );
  const { data: churchProfile, isLoading: isChurchLoading } = useDoc<ChurchProfile>(
    useMemoFirebase(
      () => (userProfile?.churchId && firestore ? doc(firestore, "churches", userProfile.churchId) : null),
      [userProfile, firestore],
    ),
  );
  const { data: roleTemplates, isLoading: areRolesLoading } = useCollection<RoleTemplate>(
    useMemoFirebase(
      () => (userProfile?.churchId && firestore ? query(collection(firestore, `churches/${userProfile.churchId}/role_templates`)) : null),
      [userProfile, firestore],
    ),
  );

  const { data: stockHeroImages } = useCollection<{ url: string; role: string; denominationCluster: string }>(
    useMemoFirebase(
      () =>
        firestore
          ? query(
              collection(firestore, "graphic_assets"),
              where("role", "==", "flyer_hero")
            )
          : null,
      [firestore]
    )
  );
  
useEffect(() => {
    if (churchProfile?.name) setWidgetTitle(churchProfile.name);
    if (churchProfile?.primaryColor) setWidgetPrimaryColor(churchProfile.primaryColor);
    if (churchProfile?.fontFamily) setWidgetFont(churchProfile.fontFamily);
  }, [churchProfile]);
  useEffect(() => {
    if (roleTemplates) setSelectedFlyerRoles(new Set(roleTemplates.map((r) => r.name)));
  }, [roleTemplates]);

  const dateRangeForFetch = useMemo(() => {
    const fromDates = [bulletinDateRange?.from, scheduleDateRange?.from, widgetDateRange?.from].filter(Boolean) as Date[];
    const toDates = [bulletinDateRange?.to, scheduleDateRange?.to, widgetDateRange?.to].filter(Boolean) as Date[];
    if (fromDates.length === 0) return { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
    const from = new Date(Math.min(...fromDates.map(d => d.getTime())));
    const to = new Date(Math.max(...toDates.map(d => d.getTime())));
    return { from, to };
  }, [bulletinDateRange, scheduleDateRange, widgetDateRange]);

  useEffect(() => {
    if (!firestore || !userProfile?.churchId) {
      if (!isProfileLoading) setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const fetchEventsAndRoles = async () => {
      const eventsQuery = query(
        collection(firestore, `churches/${userProfile.churchId}/events`),
        where("eventDate", ">=", dateRangeForFetch.from.toISOString()),
        where("eventDate", "<=", dateRangeForFetch.to.toISOString()),
        where("isPublished", "==", true),
        orderBy("eventDate"),
      );
      try {
        const eventsSnap = await getDocs(eventsQuery);
        const fetchedEvents = eventsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as WithId<Event>);
        const eventsWithRolesData: EventWithRoles[] = await Promise.all(
          fetchedEvents.map(async (event) => {
            const rolesSnap = await getDocs(query(collection(firestore, `churches/${userProfile.churchId}/events/${event.id}/roles`)));
            const roles = rolesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as WithId<Role>);
            return { ...event, roles };
          }),
        );
        setEventsWithRoles(eventsWithRolesData);
      } catch (error) {
        toast.error("Could not load schedule data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchEventsAndRoles();
  }, [firestore, userProfile?.churchId, isProfileLoading, dateRangeForFetch]);

  const bulletinHtml = useMemo(() => {
    if (!bulletinDateRange?.from || !bulletinDateRange?.to) return "<p>Select a date range.</p>";
    const relevantEvents = eventsWithRoles.filter(
      (e) => new Date(e.eventDate) >= bulletinDateRange.from! && new Date(e.eventDate) <= bulletinDateRange.to!,
    );
    if (relevantEvents.length === 0) return "<p>No published events in range.</p>";
    let html = "<div>";
    relevantEvents.forEach((event) => {
      html += `<p><strong>${event.eventName} - ${format(new Date(event.eventDate), "PPPP p")}</strong></p><ul style="margin:0 0 1em 20px;padding:0;list-style:disc;">`;
      event.roles.forEach((role) => {
        html += `<li>${role.roleName}: ${role.assignedVolunteerName || "Open"}</li>`;
      });
      html += "</ul>";
    });
    return html + "</div>";
  }, [eventsWithRoles, bulletinDateRange]);

  const scheduleTableData = useMemo((): ScheduleRow[] => {
    if (!scheduleDateRange?.from) return [];
    let filteredEvents = eventsWithRoles;
    if (scheduleDateRange.from && scheduleDateRange.to) {
      filteredEvents = eventsWithRoles.filter(
        (e) => new Date(e.eventDate) >= scheduleDateRange.from! && new Date(e.eventDate) <= scheduleDateRange.to!,
      );
    }
    return filteredEvents.flatMap((event) =>
      event.roles.map((role) => ({
        date: format(new Date(event.eventDate), "PPP"),
        time: format(new Date(event.eventDate), "p"),
        event: event.eventName,
        role: role.roleName,
        volunteer: role.assignedVolunteerName || "Open",
      })),
    );
  }, [eventsWithRoles, scheduleDateRange]);

  const widgetUrl = useMemo(() => {
    if (!userProfile?.churchId || !baseUrl) return "";
    const params = new URLSearchParams();
    if (widgetDateRange?.from) params.set("from", format(widgetDateRange.from, "yyyy-MM-dd"));
    if (widgetDateRange?.to) params.set("to", format(widgetDateRange.to, "yyyy-MM-dd"));
    if (!widgetShowHeader) params.set("noheader", "true");
    if (!widgetShowLogo) params.set("nologo", "true");
    if (widgetTitle) params.set("title", widgetTitle);
    if (widgetDescription) params.set("desc", widgetDescription);
    params.set("primaryColor", widgetPrimaryColor.substring(1));
    params.set("textColor", widgetTextColor.substring(1));
    params.set("bgColor", widgetBgColor.substring(1));
    if (widgetFont) params.set("fontFamily", widgetFont);
    return `${baseUrl}/embed/${userProfile.churchId}?${params.toString()}`;
  }, [userProfile, widgetDateRange, widgetShowHeader, widgetShowLogo, widgetTitle, widgetDescription, widgetPrimaryColor, widgetTextColor, widgetBgColor, widgetFont, baseUrl]);

  const widgetEmbedCode = useMemo(() => widgetUrl ? `<iframe src="${widgetUrl}" width="100%" height="600" style="border:none;"></iframe>` : "", [widgetUrl]);
  const signupUrl = useMemo(
    () => (userProfile?.churchId ? `${baseUrl}/join/${userProfile.churchId}` : `${baseUrl}/join`),
    [baseUrl, userProfile?.churchId],
  );

  const toggleFlyerRole = (roleName: string) => {
    setSelectedFlyerRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleName)) newSet.delete(roleName);
      else newSet.add(roleName);
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard!")).catch(() => toast.error("Failed to copy."));
  };

  const downloadAsCsv = () => {
    if (scheduleTableData.length === 0) {
      toast.error("No schedule data to download.");
      return;
    }
    const headers = Object.keys(scheduleTableData[0]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + scheduleTableData.map((row) => headers.map((header) => `"${row[header as keyof ScheduleRow]}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `schedule_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printSchedule = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write("<html><head><title>Print Schedule</title>");
      printWindow.document.write("<style>body{font-family:sans-serif;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ddd; padding:8px; text-align:left;} th{background-color:#f2f2f2;}</style>");
      printWindow.document.write("</head><body>");
      printWindow.document.write(`<h1>Schedule for ${churchProfile?.name || "the Church"}</h1>`);
      let tableHtml = "<table><thead><tr><th>Date</th><th>Time</th><th>Event</th><th>Role</th><th>Volunteer</th></tr></thead><tbody>";
      scheduleTableData.forEach((row) => { tableHtml += `<tr><td>${row.date}</td><td>${row.time}</td><td>${row.event}</td><td>${row.role}</td><td>${row.volunteer}</td></tr>`; });
      tableHtml += "</tbody></table>";
      if (tableHtml) printWindow.document.write(tableHtml);
      printWindow.document.write("</body></html>");
      printWindow.document.close();
      printWindow.print();
    }
  };

  useEffect(() => {
    if (churchProfile?.logoUrl) {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(churchProfile.logoUrl)}`;
      fetch(proxyUrl)
        .then((res) => { if (res.ok) return res.blob(); throw new Error("Failed to fetch logo"); })
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => setLogoDataUrl(reader.result as string);
          reader.readAsDataURL(blob);
        }).catch((e) => console.error("Error fetching logo for PDF:", e));
    }
  }, [churchProfile?.logoUrl]);

  const handleSaveAsPdf = async () => {
    if (!churchProfile) { toast.error("Church profile not loaded."); return; }
    setIsGenerating(true);
    toast.loading("Generating PDF...", { id: "pdf-generating" });
    try {
      const flyerData = {
        churchName: churchProfile.name || "Our Church",
        logoUrl: churchProfile.logoUrl,
        roles: Array.from(selectedFlyerRoles),
        signupUrl: signupUrl,
        primaryColor: churchProfile.primaryColor || "#15803d",
        heroImageDataUrl: flyerImageUrl,
        heroImageUrl: flyerImageUrl ? undefined : selectedStockImageUrl,
      };
      const response = await fetch("/api/generate-flyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(flyerData) });
      if (!response.ok) { throw new Error((await response.text()) || "Failed to generate PDF"); }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "volunteer-flyer.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF generated successfully!", { id: "pdf-generating" });
    } catch (error: any) {
      console.error("PDF Generation Error:", error);
      toast.error(`Failed to generate PDF: ${error.message}`, { id: "pdf-generating" });
    } finally {
      setIsGenerating(false);
    }
  };

  const dataIsLoading = isProfileLoading || isChurchLoading || isLoading;

  return (
    <div className="flex flex-col gap-8">
      <style>{`@import url('https://fonts.googleapis.com/css2?${googleFonts.map((f) => `family=${f.value.replace(/ /g, "+")}:wght@400;600;700`).join("&")}&display=swap'); ${flyerStyles}`}</style>
      <header>
        <h1 className="text-3xl font-bold">Sharing &amp; Notifications</h1>
        <p className="text-muted-foreground">Share schedules, get embed codes, and view email history.</p>
      </header>
      {dataIsLoading && (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {!dataIsLoading && userProfile?.churchId && (
        <Tabs defaultValue="notifications">
          <TabsList className="grid w-full grid-cols-6 max-w-3xl">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="bulletin">Bulletin</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="widget">Web Widget</TabsTrigger>
            <TabsTrigger value="flyer">Flyer</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value="notifications">
            <NotificationsTab />
          </TabsContent>
          <TabsContent value="bulletin">
            <Card className="border-brand-accent/20">
              <CardHeader><CardTitle>Church Bulletin Code</CardTitle><CardDescription>Copy and paste this HTML into your church bulletin software.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <Label htmlFor="bulletin-date">Date Range</Label>
                    <Popover>
                      <PopoverTrigger asChild><Button id="bulletin-date" variant="outline" className={cn("w-full justify-start text-left font-normal", !bulletinDateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{bulletinDateRange?.from ? (bulletinDateRange.to ? `${format(bulletinDateRange.from, "LLL dd, y")} - ${format(bulletinDateRange.to, "LLL dd, y")}` : format(bulletinDateRange.from, "LLL dd, y")) : (<span>Pick a date range</span>)}</Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={bulletinDateRange?.from} selected={bulletinDateRange} onSelect={setBulletinDateRange} numberOfMonths={2} /></PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-md font-mono text-sm max-h-80 overflow-auto" dangerouslySetInnerHTML={{ __html: bulletinHtml }}></div>
              </CardContent>
              <CardFooter><Button onClick={() => copyToClipboard(bulletinHtml)}><Copy className="mr-2 h-4 w-4" />Copy HTML</Button></CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="schedule">
            <Card className="border-brand-accent/20">
              <CardHeader><CardTitle>Full Schedule Export</CardTitle><CardDescription>Print or download the entire published schedule within a selected date range.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-sm">
                  <Label htmlFor="schedule-date">Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild><Button id="schedule-date" variant="outline" className={cn("w-full justify-start text-left font-normal", !scheduleDateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{scheduleDateRange?.from ? (scheduleDateRange.to ? `${format(scheduleDateRange.from, "LLL dd, y")} - ${format(scheduleDateRange.to, "LLL dd, y")}` : format(scheduleDateRange.from, "LLL dd, y")) : (<span>Pick a date range</span>)}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={scheduleDateRange?.from} selected={scheduleDateRange} onSelect={setScheduleDateRange} numberOfMonths={2} /></PopoverContent>
                  </Popover>
                </div>
                <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                  <Table id="schedule-table">
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Event</TableHead><TableHead>Role</TableHead><TableHead>Volunteer</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {scheduleTableData.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center h-24">No published assignments in this date range.</TableCell></TableRow>
                      ) : (
                        scheduleTableData.map((row, i) => (<TableRow key={i}><TableCell>{row.date}</TableCell><TableCell>{row.time}</TableCell><TableCell>{row.event}</TableCell><TableCell>{row.role}</TableCell><TableCell>{row.volunteer}</TableCell></TableRow>))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="gap-2"><Button variant="outline" onClick={printSchedule}><Printer className="mr-2 h-4 w-4" />Print</Button><Button onClick={downloadAsCsv}><Download className="mr-2 h-4 w-4" />Download as CSV</Button></CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="widget">
            <Card className="border-brand-accent/20">
              <CardHeader><CardTitle>Embeddable Web Widget</CardTitle><CardDescription>Add a live schedule view to your church website.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <h3 className="font-semibold text-lg border-b pb-2">Customization</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><Label htmlFor="show-header">Show Header</Label><Switch id="show-header" checked={widgetShowHeader} onCheckedChange={setWidgetShowHeader} /></div>
                    <div className="flex items-center justify-between"><Label htmlFor="show-logo" className={cn(!widgetShowHeader && "text-muted-foreground")}>Show Logo</Label><Switch id="show-logo" checked={widgetShowLogo} onCheckedChange={setWidgetShowLogo} disabled={!widgetShowHeader} /></div>
                    <div className="space-y-2"><Label htmlFor="widget-title" className={cn(!widgetShowHeader && "text-muted-foreground")}>Title</Label><Input id="widget-title" value={widgetTitle} onChange={(e) => setWidgetTitle(e.target.value)} disabled={!widgetShowHeader} /></div>
                    <div className="space-y-2"><Label htmlFor="widget-desc" className={cn(!widgetShowHeader && "text-muted-foreground")}>Description</Label><Input id="widget-desc" value={widgetDescription} onChange={(e) => setWidgetDescription(e.target.value)} disabled={!widgetShowHeader} /></div>
                  </div>
                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-2"><Label htmlFor="widget-date-range">Date Range</Label>
                      <Popover>
                        <PopoverTrigger asChild><Button id="widget-date-range" variant="outline" className={cn("w-full justify-start text-left font-normal",!widgetDateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{widgetDateRange?.from ? (widgetDateRange.to ? `${format(widgetDateRange.from, "LLL dd, y")} - ${format(widgetDateRange.to, "LLL dd, y")}` : format(widgetDateRange.from, "LLL dd, y")) : (<span>Pick a date range</span>)}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar initialFocus mode="range" defaultMonth={widgetDateRange?.from} selected={widgetDateRange} onSelect={setWidgetDateRange} numberOfMonths={2} /></PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label htmlFor="primary-color">Primary</Label><Input id="primary-color" type="color" value={widgetPrimaryColor} onChange={(e) => setWidgetPrimaryColor(e.target.value)} className="w-full h-10 p-1" /></div>
                      <div><Label htmlFor="text-color">Text</Label><Input id="text-color" type="color" value={widgetTextColor} onChange={(e) => setWidgetTextColor(e.target.value)} className="w-full h-10 p-1" /></div>
                      <div><Label htmlFor="bg-color">Background</Label><Input id="bg-color" type="color" value={widgetBgColor} onChange={(e) => setWidgetBgColor(e.target.value)} className="w-full h-10 p-1" /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="widget-font">Font</Label>
                      <Select value={widgetFont} onValueChange={setWidgetFont}><SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{googleFonts.map((font) => (<SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>{font.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2 space-y-4"><h3 className="font-semibold text-lg border-b pb-2">Preview</h3><div className="w-full h-[600px] border rounded-md overflow-hidden bg-background"><iframe src={widgetUrl} width="100%" height="100%" className="border-0" title="Schedule Widget Preview"></iframe></div></div>
              </CardContent>
              <CardFooter><div className="w-full space-y-2"><Label htmlFor="embed-code">Embed Code</Label><div className="flex gap-2"><Input id="embed-code" readOnly value={widgetEmbedCode} className="font-mono" /><Button onClick={() => copyToClipboard(widgetEmbedCode)}><Copy className="mr-2 h-4 w-4" />Copy</Button></div></div></CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="calendar">
            <UpgradeGate feature="Calendar Subscription Feeds" locked={!canUse("calendarFeeds")}>
            <Card className="border-brand-accent/20">
              <CardHeader>
                <CardTitle>Calendar Subscription Feed</CardTitle>
                <CardDescription>
                  Subscribe to a live iCal feed of all published events. The feed includes every event with a full role roster — showing each assigned volunteer (or &ldquo;Open&rdquo; for unfilled roles). Works with Google Calendar, Apple Calendar, Outlook, and any app that supports webcal subscriptions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Church Calendar Feed URL</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={baseUrl && userProfile?.churchId ? `${baseUrl}/api/calendar/church/${userProfile.churchId}` : "Loading…"}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(`${baseUrl}/api/calendar/church/${userProfile?.churchId}`)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => {
                      const url = `${baseUrl}/api/calendar/church/${userProfile?.churchId}`;
                      window.open(url.replace(/^https?:\/\//, "webcal://"), "_blank");
                    }}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Subscribe with Calendar App
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = encodeURIComponent(`${baseUrl}/api/calendar/church/${userProfile?.churchId}`);
                      window.open(`https://calendar.google.com/calendar/r?cid=${url}`, "_blank");
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Add to Google Calendar
                  </Button>
                </div>
                <div className="rounded-md bg-muted/50 border p-4 text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">What&apos;s included in the feed:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>All published events with date and time</li>
                    <li>Full role roster for each event (e.g. &ldquo;Lector: Jane Smith&rdquo;)</li>
                    <li>Open/unfilled roles marked as &ldquo;(Open)&rdquo;</li>
                    <li>Roles with pending substitutions flagged with a warning</li>
                  </ul>
                  <p className="pt-2">The feed updates automatically — calendar apps typically refresh every 24 hours. Share this URL with staff or leadership who need visibility into the full schedule.</p>
                </div>
              </CardContent>
            </Card>
            </UpgradeGate>
          </TabsContent>
          <TabsContent value="flyer">
            <Card className="border-brand-accent/20">
              <CardHeader className="pb-3">
                <CardTitle>Volunteer Recruitment Flyer</CardTitle>
                <CardDescription>Customize and download a flyer to recruit new volunteers for your church.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col lg:flex-row gap-5 items-start">

                {/* ── Controls column ── */}
                <div className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-4 space-y-4">

                  {/* Hero image */}
                  <div className="space-y-2">
                    <Label className="font-semibold">Hero Image</Label>

                    {stockHeroImages && stockHeroImages.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Stock photos:</p>
                        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
                          {stockHeroImages.map((img) => (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => { setSelectedStockImageUrl(img.url); setFlyerImageUrl(undefined); }}
                              className={cn(
                                "relative w-full rounded-md overflow-hidden border-2 transition-all",
                                "aspect-[3/1]",
                                selectedStockImageUrl === img.url && !flyerImageUrl
                                  ? "border-brand-accent ring-2 ring-brand-accent/30"
                                  : "border-transparent hover:border-muted-foreground/40"
                              )}
                            >
                              <Image src={img.url} alt={img.denominationCluster ?? "Stock photo"} fill className="object-cover" unoptimized />
                              {selectedStockImageUrl === img.url && !flyerImageUrl && (
                                <div className="absolute inset-0 bg-brand-accent/10 flex items-center justify-center">
                                  <CheckSquare className="h-5 w-5 text-brand-accent drop-shadow" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <label
                      htmlFor="flyer-image-upload"
                      className="flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed rounded-md py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Download className="h-4 w-4 rotate-180" />
                      {flyerImageUrl ? "Replace upload" : "Upload your own"}
                      <input id="flyer-image-upload" type="file" accept="image/*" className="hidden" onChange={handleFlyerImageUpload} />
                    </label>
                    {flyerImageUrl && (
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2" onClick={() => setFlyerImageUrl(undefined)}>
                        Remove upload
                      </Button>
                    )}
                  </div>

                  {/* Roles */}
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Roles to Display</Label>
                    <p className="text-xs text-muted-foreground">Select roles to feature on the flyer.</p>
                    <div className="max-h-44 overflow-y-auto space-y-0.5 border rounded-md p-2">
                      {areRolesLoading && <p className="text-sm text-muted-foreground p-2">Loading roles...</p>}
                      {roleTemplates?.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded hover:bg-muted"
                          onClick={() => toggleFlyerRole(role.name)}
                        >
                          {selectedFlyerRoles.has(role.name)
                            ? <CheckSquare className="h-4 w-4 text-brand-accent shrink-0" />
                            : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <span className="text-sm">{role.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Download */}
                  <Button onClick={handleSaveAsPdf} className="w-full" disabled={isGenerating}>
                    {isGenerating ? "Generating..." : <><Download className="mr-2 h-4 w-4" />Save as PDF</>}
                  </Button>
                </div>

                {/* ── Preview column ── */}
                <div className="flex-1 min-w-0 w-full">
                  <Label className="font-semibold block mb-2">Flyer Preview</Label>
                  {/*
                    Wrapper height = scaled flyer height so no clipping and no extra whitespace.
                    Inner div is position:absolute so transform:scale() doesn't blow out the layout.
                  */}
                  <div
                    ref={previewWrapperRef}
                    className="w-full rounded-lg border bg-slate-100 relative overflow-hidden"
                    style={{ height: FLYER_HEIGHT_PX * scaleFactor }}
                  >
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      transform: `scale(${scaleFactor})`,
                      transformOrigin: "top left",
                      width: FLYER_WIDTH_PX,
                      height: FLYER_HEIGHT_PX,
                    }}>
                      <FlyerContent
                        churchProfile={churchProfile}
                        selectedRoles={selectedFlyerRoles}
                        signupUrl={signupUrl}
                        logoDataUrl={logoDataUrl}
                        primaryColor={churchProfile?.primaryColor || "#15803d"}
                        fontFamily={churchProfile?.fontFamily || "Inter"}
                        flyerImageUrl={flyerImageUrl}
                        defaultHeroImageUrl={selectedStockImageUrl}
                      />
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      {!dataIsLoading && !userProfile?.churchId && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center gap-3 pt-6 text-destructive">
            <Church className="h-5 w-5 shrink-0" />
            <p>Could not load sharing information. Please contact support.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
