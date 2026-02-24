"use client";

import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RetryButton({
  onClick,
  disabled,
  label = "Try again"
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <span className="inline-flex items-center gap-2">
        <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
    </Button>
  );
}

