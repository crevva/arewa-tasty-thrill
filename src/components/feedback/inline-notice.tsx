"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type InlineNoticeProps = {
  type?: "error" | "success" | "info";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

const iconMap = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info
} as const;

const styles = {
  error: "border-destructive/30 bg-destructive/5 text-destructive",
  success: "border-green-700/30 bg-green-700/5 text-green-700",
  info: "border-primary/25 bg-primary/5 text-primary"
} as const;

export function InlineNotice({
  type = "info",
  title,
  description,
  actionLabel,
  onAction,
  className
}: InlineNoticeProps) {
  const Icon = iconMap[type];

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        styles[type],
        className
      )}
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          {description ? <p className="mt-1 text-sm text-foreground/85">{description}</p> : null}
          {actionLabel && onAction ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-8"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

