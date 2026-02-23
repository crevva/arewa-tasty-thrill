import * as React from "react";

import { cn } from "@/lib/utils/cn";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn(
        "focus-ring relative inline-flex h-6 w-11 items-center rounded-full border border-input transition",
        checked ? "bg-primary" : "bg-muted",
        disabled ? "cursor-not-allowed opacity-50" : "",
        className
      )}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-card shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

