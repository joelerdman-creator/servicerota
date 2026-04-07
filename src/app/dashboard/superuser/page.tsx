"use client";

import { useEffect, useState } from "react";
import { useFirestore } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, LifeBuoy, ImageIcon, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PLANS, PlanId } from "@/lib/plans";

interface ChurchDoc {
  id: string;
  name: string;
  planId?: PlanId;
  subscriptionStatus?: string;
  denomination?: string;
  createdAt?: Timestamp;
}

interface KPIs {
  totalChurches: number;
  planBreakdown: Record<string, number>;
  activeSubscriptions: number;
  pastDue: number;
  totalUsers: number;
  openTickets: number;
  recentChurches: ChurchDoc[];
}

const PLAN_COLORS: Record<string, string> = {
  free: "secondary",
  pro: "default",
  growth: "warning",
  multi_site: "destructive",
};

export default function SuperUserDashboardPage() {
  const firestore = useFirestore();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const load = async () => {
      try {
        const [churchSnap, userSnap, ticketSnap] = await Promise.all([
          getDocs(query(collection(firestore, "churches"), orderBy("name"))),
          getDocs(query(collection(firestore, "users"), limit(1000))),
          getDocs(query(collection(firestore, "support_tickets"), where("status", "in", ["Open", "In Progress"]))),
        ]);

        const churches = churchSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ChurchDoc));

        const planBreakdown: Record<string, number> = { free: 0, pro: 0, growth: 0, multi_site: 0 };
        let activeSubscriptions = 0;
        let pastDue = 0;

        for (const c of churches) {
          const plan = c.planId ?? "free";
          planBreakdown[plan] = (planBreakdown[plan] ?? 0) + 1;
          if (c.subscriptionStatus === "active" || c.subscriptionStatus === "trialing") activeSubscriptions++;
          if (c.subscriptionStatus === "past_due") pastDue++;
        }

        const thirtyDaysAgo = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const recentChurches = churches
          .filter((c) => c.createdAt && c.createdAt.seconds > thirtyDaysAgo.seconds)
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
          .slice(0, 5);

        setKpis({
          totalChurches: churches.length,
          planBreakdown,
          activeSubscriptions,
          pastDue,
          totalUsers: userSnap.size,
          openTickets: ticketSnap.size,
          recentChurches,
        });
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [firestore]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground">Live metrics across all churches and users.</p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/superuser/churches">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Churches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpis?.totalChurches ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis?.activeSubscriptions ?? 0} active subscriptions
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/superuser/users">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpis?.totalUsers ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">across all churches</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/superuser/tickets">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LifeBuoy className="h-4 w-4" /> Open Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpis?.openTickets ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">open or in progress</p>
            </CardContent>
          </Card>
        </Link>

        <Card className={kpis?.pastDue ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Past Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${kpis?.pastDue ? "text-destructive" : ""}`}>
              {kpis?.pastDue ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">payment issues</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Breakdown + Recent Sign-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(PLANS).map(([planId, plan]) => {
              const count = kpis?.planBreakdown[planId] ?? 0;
              const total = kpis?.totalChurches || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={planId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={PLAN_COLORS[planId] as any}>{plan.name}</Badge>
                    </div>
                    <span className="text-sm font-medium">{count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Sign-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Recent Sign-ups
              <span className="text-sm font-normal text-muted-foreground ml-1">(last 30 days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis?.recentChurches.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No new churches in the last 30 days.</p>
            ) : (
              <div className="space-y-3">
                {kpis?.recentChurches.map((church) => (
                  <Link
                    key={church.id}
                    href={`/dashboard/superuser/churches/${church.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{church.name}</p>
                      <p className="text-xs text-muted-foreground">{church.denomination ?? "No denomination"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={PLAN_COLORS[church.planId ?? "free"] as any}>
                        {PLANS[church.planId ?? "free"]?.name ?? "Free"}
                      </Badge>
                      {church.createdAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(church.createdAt.seconds * 1000), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: "/dashboard/superuser/churches", icon: Building2, label: "Manage Churches" },
          { href: "/dashboard/superuser/users", icon: Users, label: "Manage Users" },
          { href: "/dashboard/superuser/tickets", icon: LifeBuoy, label: "Support Tickets" },
          { href: "/dashboard/superuser/assets", icon: ImageIcon, label: "Image Assets" },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer text-center py-6">
              <Icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">{label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
