import { cn } from "@/lib/utils";

/**
 * Item #12: Skeleton loading components for a premium feel.
 * Drop-in replacements for "Loading..." text used throughout the app.
 */

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-12 w-1/4" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-8 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-2/5" />
        <Skeleton className="h-5 w-1/3" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <CardSkeleton />
        <div className="xl:col-span-2">
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-5 w-1/3" />
          <TableSkeleton rows={4} />
        </div>
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-5 w-1/3" />
          <TableSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}
