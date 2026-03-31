
"use client";

import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { UserCheck, EyeOff, Users, CalendarIcon, Loader2, Sparkles, ArrowRight, AlertTriangle, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import {
  collection,
  query,
  where,
  doc,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface UserProfile {
  churchId: string;
  role: string;
  status?: "active" | "pending_approval";
  displayName?: string;
}

interface Event {
  id: string;
  eventName: string;
  eventDate: string; // ISO string
  isPublished?: boolean;
}
interface Role {
  assignedVolunteerId?: string;
}

interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
}

export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: adminProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const [stats, setStats] = useState({
    pendingVolunteers: 0,
    totalVolunteers: 0,
    unpublishedEvents30: 0,
    unpublishedEvents60: 0,
    unpublishedEvents90: 0,
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [reportData, setReportData] = useState({
    volunteerHistory: new Map<string, number>(),
    fillRates: new Map<string, { filled: number; total: number; name: string }>(),
    openRolesCount: 0,
  });

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);

  const { data: allUsers, isLoading: usersLoading } = useCollection<Volunteer>(
    useMemoFirebase(
      () =>
        adminProfile?.churchId && firestore
          ? query(collection(firestore, "users"), where("churchId", "==", adminProfile.churchId))
          : null,
      [adminProfile, firestore],
    ),
  );

  // Stats: derived from allUsers (already fetched via useCollection) + events fetch
  useEffect(() => {
    if (!firestore || !adminProfile?.churchId || usersLoading) {
      return;
    }

    const fetchDashboardData = async () => {
      setLoadingStats(true);
      setLoadingReports(true);
      const churchId = adminProfile.churchId;

      // --- Stats widgets: use allUsers already fetched via useCollection ---
      const eventsSnapshot = await getDocs(collection(firestore, "churches", churchId, "events"));
      const eventList = eventsSnapshot.docs.map((d) => d.data());

      const userList = allUsers ?? [];
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const unpublishedEvents = eventList.filter((e) => !e.isPublished);
      const filterByDateRange = (events: any[], start: Date, end: Date) => {
        return events.filter((e) => {
          const eventDate = new Date(e.eventDate);
          return eventDate >= start && eventDate <= end;
        }).length;
      };

      setStats({
        pendingVolunteers: userList.filter((u: any) => u.status === "pending_approval").length,
        totalVolunteers: userList.filter((u: any) => u.role !== "admin").length,
        unpublishedEvents30: filterByDateRange(unpublishedEvents, now, thirtyDaysFromNow),
        unpublishedEvents60: filterByDateRange(
          unpublishedEvents,
          thirtyDaysFromNow,
          sixtyDaysFromNow,
        ),
        unpublishedEvents90: filterByDateRange(
          unpublishedEvents,
          sixtyDaysFromNow,
          ninetyDaysFromNow,
        ),
      });
      setLoadingStats(false);

      // --- Fetch data for reports ---
      if (!dateRange?.from || !dateRange?.to) {
        setLoadingReports(false);
        return;
      }

      const reportEventsQuery = query(
        collection(firestore, `churches/${churchId}/events`),
        where("eventDate", ">=", dateRange.from.toISOString()),
        where("eventDate", "<=", dateRange.to.toISOString()),
        orderBy("eventDate"),
      );

      const reportEventsSnapshot = await getDocs(reportEventsQuery);
      const reportEvents = reportEventsSnapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Event,
      );

      const newVolunteerHistory = new Map<string, number>();
      const newFillRates = new Map<string, { filled: number; total: number; name: string }>();

      // Fetch all roles in parallel instead of sequentially (fixes N+1 query)
      const rolesFetchPromises = reportEvents.map(async (event) => {
        const rolesQuery = query(
          collection(firestore, `churches/${churchId}/events/${event.id}/roles`),
        );
        const rolesSnapshot = await getDocs(rolesQuery);
        return { event, roles: rolesSnapshot.docs.map((d) => d.data() as Role) };
      });

      const allEventRoles = await Promise.all(rolesFetchPromises);

      let totalOpenRoles = 0;
      for (const { event, roles } of allEventRoles) {
        let filledCount = 0;
        roles.forEach((role) => {
          if (role.assignedVolunteerId) {
            filledCount++;
            newVolunteerHistory.set(
              role.assignedVolunteerId,
              (newVolunteerHistory.get(role.assignedVolunteerId) || 0) + 1,
            );
          } else {
            totalOpenRoles++;
          }
        });

        newFillRates.set(event.id, {
          filled: filledCount,
          total: roles.length,
          name: event.eventName,
        });
      }

      setReportData({ volunteerHistory: newVolunteerHistory, fillRates: newFillRates, openRolesCount: totalOpenRoles });
      setLoadingReports(false);
    };

    fetchDashboardData();
  }, [firestore, adminProfile, dateRange, allUsers, usersLoading]);

  const volunteerHistoryReport = useMemo(() => {
    if (!allUsers) return [];
    return allUsers
      .map((v) => ({
        ...v,
        assignmentCount: reportData.volunteerHistory.get(v.id) || 0,
      }))
      .sort((a, b) => b.assignmentCount - a.assignmentCount);
  }, [reportData.volunteerHistory, allUsers]);

  const fillRateReport = useMemo(() => {
    return Array.from(reportData.fillRates.entries()).map(([eventId, rates]) => ({
      eventId,
      ...rates,
    }));
  }, [reportData.fillRates]);

  if (isUserLoading || isProfileLoading) {
    return <DashboardSkeleton />;
  }

  if (!adminProfile?.churchId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Error: Could not find your Church ID. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="mb-4">
        <h1 className="text-3xl md:text-4xl font-bold">Welcome, {user?.displayName || "Admin"}!</h1>
        <p className="text-muted-foreground text-lg mt-1">
          Here&apos;s a summary of activity for your church.
        </p>
      </header>

      {/* Dynamic Next Steps Guidance Card */}
      {(!loadingStats && !loadingReports) && (
        <Card className="border-brand-accent/30 bg-brand-accent/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-brand-accent/20 rounded-lg">
                <Sparkles className="h-6 w-6 text-brand-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Recommended Next Step</h3>
                {stats.pendingVolunteers > 0 ? (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-muted-foreground">
                      You have <span className="font-bold text-foreground">{stats.pendingVolunteers} volunteer{stats.pendingVolunteers > 1 ? "s" : ""}</span> awaiting approval. Review and approve them so they can start serving.
                    </p>
                    <Link href="/dashboard/admin/volunteers">
                      <Button size="sm" className="ml-4 shrink-0">
                        Review <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ) : stats.unpublishedEvents30 > 0 ? (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-muted-foreground">
                      <span className="font-bold text-destructive">{stats.unpublishedEvents30} event{stats.unpublishedEvents30 > 1 ? "s" : ""}</span> in the next 30 days {stats.unpublishedEvents30 > 1 ? "are" : "is"} still unpublished. Volunteers can&apos;t see them yet.
                    </p>
                    <Link href="/dashboard/admin/events">
                      <Button size="sm" variant="destructive" className="ml-4 shrink-0">
                        <AlertTriangle className="mr-1 h-4 w-4" /> Publish Now
                      </Button>
                    </Link>
                  </div>
                ) : reportData.openRolesCount > 0 ? (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-muted-foreground">
                      Your events are published, but <span className="font-bold text-foreground">{reportData.openRolesCount} role{reportData.openRolesCount > 1 ? "s" : ""}</span> still {reportData.openRolesCount > 1 ? "need" : "needs"} volunteers. Run the <span className="font-semibold">Auto-Assign Wizard</span> to fill them quickly.
                    </p>
                    <Link href="/dashboard/admin/schedule-wizard">
                      <Button size="sm" variant="outline" className="ml-4 shrink-0">
                        Auto-Assign <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-muted-foreground">
                      Everything looks good! Your scheduled services are fully staffed and published. Enjoy the peace of mind.
                    </p>
                    <Link href="/dashboard/admin/events">
                      <Button size="sm" variant="outline" className="ml-4 shrink-0">
                        View Schedule <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <Link href="/dashboard/admin/volunteers" className="xl:col-span-1 flex">
          <Card className="hover:bg-muted/50 transition-colors h-full w-full flex flex-col border-brand-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <UserCheck className="h-6 w-6 text-brand-accent" />
                Pending Volunteers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">
                {loadingStats ? "..." : stats.pendingVolunteers}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Click to review and approve new volunteers.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/events" className="xl:col-span-2 flex">
          <Card className="hover:bg-muted/50 transition-colors h-full w-full flex flex-col border-brand-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <EyeOff className="h-6 w-6 text-brand-accent" />
                Unpublished Events
              </CardTitle>
              <CardDescription>Draft events not yet visible to volunteers.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 divide-x text-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    0-30 Days
                  </p>
                  <p className={`text-5xl font-bold ${!loadingStats && stats.unpublishedEvents30 > 0 ? "text-destructive" : ""}`}>
                    {loadingStats ? "..." : stats.unpublishedEvents30}
                  </p>
                  {!loadingStats && stats.unpublishedEvents30 > 0 && (
                    <p className="text-xs text-destructive font-medium mt-1 flex items-center justify-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Urgent
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    31-60 Days
                  </p>
                  <p className={`text-5xl font-bold ${!loadingStats && stats.unpublishedEvents60 > 0 ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                    {loadingStats ? "..." : stats.unpublishedEvents60}
                  </p>
                  {!loadingStats && stats.unpublishedEvents60 > 0 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-1 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" /> Approaching
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    61-90 Days
                  </p>
                  <p className={`text-5xl font-bold ${!loadingStats && stats.unpublishedEvents90 > 0 ? "text-green-600 dark:text-green-400" : ""}`}>
                    {loadingStats ? "..." : stats.unpublishedEvents90}
                  </p>
                  {!loadingStats && stats.unpublishedEvents90 > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Healthy
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/volunteers" className="xl:col-span-1 flex">
          <Card className="hover:bg-muted/50 transition-colors h-full w-full flex flex-col border-brand-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <Users className="h-6 w-6 text-brand-accent" />
                Total Volunteers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">
                {loadingStats ? "..." : stats.totalVolunteers}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Active volunteers (excludes admins)
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* --- Reports Section --- */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Volunteer Analytics</h2>
            <p className="text-muted-foreground">
              Insights into volunteer engagement and scheduling efficiency.
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex gap-1 p-2 border-b">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}
                >
                  This Month
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => {
                    const last = subMonths(new Date(), 1);
                    setDateRange({ from: startOfMonth(last), to: endOfMonth(last) });
                  }}
                >
                  Last Month
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => {
                    const threeMonthsAgo = subMonths(new Date(), 3);
                    setDateRange({ from: startOfDay(startOfMonth(threeMonthsAgo)), to: endOfDay(endOfMonth(new Date())) });
                  }}
                >
                  Last 3 Months
                </Button>
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        {loadingReports ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card className="border-brand-accent/20">
              <CardHeader>
                <CardTitle>Volunteer Service History</CardTitle>
                <CardDescription>
                  Number of assignments per volunteer in the selected period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Volunteer</TableHead>
                        <TableHead className="text-right">Assignments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {volunteerHistoryReport.length > 0 ? (
                        volunteerHistoryReport.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">
                              {v.firstName} {v.lastName}
                            </TableCell>
                            <TableCell className="text-right">{v.assignmentCount}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="h-24 text-center">
                            No assignments in this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            <Card className="border-brand-accent/20">
              <CardHeader>
                <CardTitle>Event Fill Rate</CardTitle>
                <CardDescription>
                  Percentage of roles filled for each event in the selected period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead className="text-right">Fill Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fillRateReport.length > 0 ? (
                        fillRateReport.map((e) => {
                          const fillRate =
                            e.total > 0 ? Math.round((e.filled / e.total) * 100) : 100;
                          return (
                            <TableRow key={e.eventId}>
                              <TableCell className="font-medium">{e.name}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span>{fillRate}%</span>
                                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-brand-accent"
                                      style={{ width: `${fillRate}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="h-24 text-center">
                            No events found in this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
