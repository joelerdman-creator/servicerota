"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpgradeGateProps {
  /** Feature name shown in the prompt */
  feature: string;
  /** Minimum plan name required */
  requiredPlan?: string;
  /** Render children when unlocked, gate when not */
  locked: boolean;
  children: React.ReactNode;
  /** Compact inline lock badge instead of full overlay */
  inline?: boolean;
}

/**
 * Wraps a UI section and shows an upgrade prompt when the feature is locked.
 * Use `inline` for buttons/small controls; default for card-level sections.
 */
export function UpgradeGate({ feature, requiredPlan = "Parish Standard", locked, children, inline = false }: UpgradeGateProps) {
  if (!locked) return <>{children}</>;

  if (inline) {
    return (
      <div className="relative inline-flex items-center gap-2">
        <div className="opacity-40 pointer-events-none select-none">{children}</div>
        <Link href="/dashboard/admin/billing">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap">
            <Lock className="h-3 w-3" />
            Upgrade
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
      {/* Blurred preview */}
      <div className="opacity-30 pointer-events-none select-none blur-[2px]">{children}</div>
      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/60 backdrop-blur-[1px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-5 w-5" />
          <span className="font-medium">{feature}</span>
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Available on <span className="font-semibold text-foreground">{requiredPlan}</span> and above.
        </p>
        <Button size="sm" asChild>
          <Link href="/dashboard/admin/billing">View Plans</Link>
        </Button>
      </div>
    </div>
  );
}
