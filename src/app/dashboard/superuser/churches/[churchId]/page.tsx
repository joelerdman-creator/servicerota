"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirestore } from "@/firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  LifeBuoy,
  ChevronLeft,
  Loader2,
  ExternalLink,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { PLANS, PlanId } from "@/lib/plans";

interface ChurchDoc {
  id: string;
  name: string;
  denomination?: string;
  address?: string;
  planId?: PlanId;
  subscriptionStatus?: string;
  currentPeriodEnd?: number;
  smsMonthlyLimit?: number;
  primaryColor?: string;
  // Populated from billing subcollection after fetch
  stripeCustomerId?: string;
  subscriptionId?: string;
}

interface UserDoc {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
}

interface TicketDoc {
  id: string;
  subject: string;
  status: string;
  submittedByName?: string;
  createdAt?: Timestamp;
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "warning" | "destructive" | "outline"> = {
  active: "default",
  trialing: "secondary",
  past_due: "destructive",
  canceling: "warning",
  canceled: "outline",
};

const PLAN_BADGE: Record<string, "default" | "secondary" | "warning" | "destructive" | "outline"> = {
  free: "secondary",
  pro: "default",
  growth: "warning",
  multi_site: "destructive",
};

export default function ChurchDetailPage() {
  const { churchId } = useParams<{ churchId: string }>();
  const router = useRouter();
  const firestore = useFirestore();

  const [church, setChurch] = useState<ChurchDoc | null>(null);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [tickets, setTickets] = useState<TicketDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !churchId) return;

    const load = async () => {
      try {
        const [churchSnap, billingSnap, usersSnap, ticketsSnap] = await Promise.all([
          getDoc(doc(firestore, "churches", churchId)),
          getDoc(doc(firestore, "churches", churchId, "billing", "config")),
          getDocs(query(collection(firestore, "users"), where("churchId", "==", churchId), orderBy("firstName"))),
          getDocs(
            query(
              collection(firestore, "support_tickets"),
              where("churchId", "==", churchId),
              orderBy("createdAt", "desc"),
              limit(10),
            ),
          ),
        ]);

        if (!churchSnap.exists()) {
          router.replace("/dashboard/superuser/churches");
          return;
        }

        const billing = billingSnap.exists() ? billingSnap.data() : {};
        setChurch({
          id: churchSnap.id,
          ...churchSnap.data(),
          stripeCustomerId: billing.stripeCustomerId,
          subscriptionId: billing.subscriptionId,
        } as ChurchDoc);
        setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as UserDoc)));
        setTickets(ticketsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TicketDoc)));
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [firestore, churchId, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!church) return null;

  const plan = PLANS[church.planId ?? "free"];
  const admins = users.filter((u) => u.isAdmin);
  const volunteers = users.filter((u) => !u.isAdmin);
  const openTickets = tickets.filter((t) => t.status !== "Closed");

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4 -ml-2">
          <ChevronLeft className="h-4 w-4 mr-1" /> All Churches
        </Button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{church.name}</h1>
              <p className="text-muted-foreground">{church.denomination ?? "No denomination"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={PLAN_BADGE[church.planId ?? "free"]} className="text-sm px-3 py-1">
              {plan.name}
            </Badge>
            {church.subscriptionStatus && (
              <Badge variant={STATUS_BADGE[church.subscriptionStatus] ?? "outline"} className="text-sm px-3 py-1">
                {church.subscriptionStatus.replace("_", " ")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Admins</p>
            <p className="text-3xl font-bold">{admins.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Volunteers</p>
            <p className="text-3xl font-bold">{volunteers.length}</p>
            <p className="text-xs text-muted-foreground">
              of {plan.volunteerLimit === -1 ? "∞" : plan.volunteerLimit} limit
            </p>
          </CardContent>
        </Card>
        <Card className={openTickets.length > 0 ? "border-warning" : ""}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Open Tickets</p>
            <p className="text-3xl font-bold">{openTickets.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Plan" value={plan.name} />
            <Row label="Status" value={
              church.subscriptionStatus
                ? <Badge variant={STATUS_BADGE[church.subscriptionStatus] ?? "outline"}>{church.subscriptionStatus.replace("_", " ")}</Badge>
                : <span className="text-muted-foreground">Free / no subscription</span>
            } />
            {church.currentPeriodEnd && (
              <Row
                label="Renews"
                value={`${format(new Date(church.currentPeriodEnd * 1000), "MMM d, yyyy")} (${formatDistanceToNow(new Date(church.currentPeriodEnd * 1000), { addSuffix: true })})`}
              />
            )}
            {church.stripeCustomerId && (
              <Row label="Stripe Customer" value={
                <a
                  href={`https://dashboard.stripe.com/customers/${church.stripeCustomerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-500 hover:underline"
                >
                  {church.stripeCustomerId} <ExternalLink className="h-3 w-3" />
                </a>
              } />
            )}
            {church.subscriptionId && <Row label="Subscription ID" value={church.subscriptionId} />}
            <Row label="Volunteer Limit" value={plan.volunteerLimit === -1 ? "Unlimited" : String(plan.volunteerLimit)} />
            <Row label="SMS / Month" value={
              church.smsMonthlyLimit !== undefined
                ? `${church.smsMonthlyLimit} (custom override)`
                : plan.smsMonthlyLimit === -1 ? "Unlimited" : String(plan.smsMonthlyLimit)
            } />
            {church.address && <Row label="Address" value={church.address} />}
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Users className="h-5 w-5" /> Users</span>
              <Link
                href={`/dashboard/superuser/users?churchId=${churchId}`}
                className="text-sm font-normal text-muted-foreground hover:text-foreground"
              >
                View all →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>
            ) : (
              <div className="divide-y max-h-72 overflow-y-auto">
                {users.slice(0, 20).map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="font-medium text-sm">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    {u.isAdmin && <Badge>Admin</Badge>}
                  </div>
                ))}
                {users.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center py-2">+{users.length - 20} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tickets */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><LifeBuoy className="h-5 w-5" /> Support Tickets</span>
              <Link
                href="/dashboard/superuser/tickets"
                className="text-sm font-normal text-muted-foreground hover:text-foreground"
              >
                View all →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tickets from this church.</p>
            ) : (
              <div className="divide-y">
                {tickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/support/${t.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.submittedByName}
                        {t.createdAt && ` · ${formatDistanceToNow(new Date(t.createdAt.seconds * 1000), { addSuffix: true })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === "past_due" && <AlertCircle className="h-4 w-4 text-destructive" />}
                      <Badge variant={t.status === "Closed" ? "outline" : t.status === "Open" ? "warning" : "secondary"}>
                        {t.status}
                      </Badge>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
