"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle() {
  const { toggleTheme, isHydrated } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      onClick={toggleTheme}
      className={cn(
        "relative h-9 w-9 rounded-full p-0",
        "text-muted-foreground hover:text-primary"
      )}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">
        {isHydrated ? "Toggle dark mode" : "Switch appearance"}
      </span>
    </Button>
  );
}

