import * as React from "react";

import { cn } from "@/lib/utils/cn";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "focus-ring flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
          className
        )}
        {...props}
      />
    );
  }
);

Select.displayName = "Select";
