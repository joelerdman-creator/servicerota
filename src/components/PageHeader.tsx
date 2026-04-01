"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref: string;
  backLabel?: string;
  children?: React.ReactNode; // optional right-side content (badges, actions)
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  children,
}: PageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Link>
        </Button>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold">{title}</h1>
        {children}
      </div>
      {description && (
        <p className="text-muted-foreground mt-2">{description}</p>
      )}
    </header>
  );
}
