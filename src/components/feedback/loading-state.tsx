"use client";

import { Loader2 } from "lucide-react";

type LoadingStateProps = {
  label: string;
  className?: string;
};

export function LoadingState({ label, className }: LoadingStateProps) {
  return (
    <div
      className={className ?? "premium-card p-4"}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}

