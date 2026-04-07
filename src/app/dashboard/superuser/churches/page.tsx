"use client";

import { useEffect, useState } from "react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, Search, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { PLANS, PlanId } from "@/lib/plans";

interface ChurchDoc {
  id: string;
  name: string;
  denomination?: string;
  address?: string;
  planId?: PlanId;
  subscriptionStatus?: "active" | "trialing" | "past_due" | "canceling" | "canceled";
  currentPeriodEnd?: number;
  createdAt?: Timestamp;
}

const PLAN_BADGE: Record<string, "default" | "secondary" | "warning" | "destructive" | "outline"> = {
  free: "secondary",
  pro: "default",
  growth: "warning",
  multi_site: "destructive",
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "warning" | "destructive" | "outline"> = {
  active: "default",
  trialing: "secondary",
  past_due: "destructive",
  canceling: "warning",
  canceled: "outline",
};

export default function ChurchesPage() {
  const firestore = useFirestore();
  const [churches, setChurches] = useState<ChurchDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!firestore) return;
    getDocs(query(collection(firestore, "churches"), orderBy("name")))
      .then((snap) => setChurches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChurchDoc))))
      .finally(() => setIsLoading(false));
  }, [firestore]);

  const filtered = churches.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.denomination?.toLowerCase().includes(search.toLowerCase())
  );

  const planCounts = Object.fromEntries(
    Object.keys(PLANS).map((p) => [p, churches.filter((c) => (c.planId ?? "free") === p).length])
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Churches</h1>
        <p className="text-muted-foreground">All registered instances on the platform.</p>
      </header>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(PLANS).map(([planId, plan]) => (
          <Card key={planId} className="py-3">
            <CardContent className="px-4 py-0 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{plan.name}</p>
                <p className="text-2xl font-bold">{planCounts[planId] ?? 0}</p>
              </div>
              <Badge variant={PLAN_BADGE[planId]}>{planId === "multi_site" ? "Multi" : plan.name.split(" ")[1]}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Churches</CardTitle>
          <CardDescription>{isLoading ? "Loading..." : `${filtered.length} of ${churches.length} churches`}</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or denomination..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No churches found.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((church) => {
                const plan = PLANS[church.planId ?? "free"];
                const isPastDue = church.subscriptionStatus === "past_due";
                return (
                  <Link
                    key={church.id}
                    href={`/dashboard/superuser/churches/${church.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{church.name}</p>
                          {isPastDue && <AlertCircle className="h-4 w-4 text-destructive" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{church.denomination ?? "No denomination"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <Badge variant={PLAN_BADGE[church.planId ?? "free"]}>{plan.name}</Badge>
                        {church.subscriptionStatus && (
                          <Badge variant={STATUS_BADGE[church.subscriptionStatus] ?? "outline"} className="text-xs">
                            {church.subscriptionStatus.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      {church.currentPeriodEnd && (
                        <p className="hidden md:block text-xs text-muted-foreground">
                          Renews {format(new Date(church.currentPeriodEnd * 1000), "MMM d, yyyy")}
                        </p>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
