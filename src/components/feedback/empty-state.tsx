"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon
}: EmptyStateProps) {
  return (
    <div className="premium-card p-8 text-center">
      {icon ? <div className="mx-auto mb-2 w-fit text-primary">{icon}</div> : null}
      <h2 className="font-heading text-2xl text-primary">{title}</h2>
      <p className="mt-2 text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

