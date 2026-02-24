"use client";

import * as React from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type ToastType = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  type?: ToastType;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastType, string> = {
  success: "border-green-700/25 bg-green-700/10 text-green-700",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-primary/25 bg-primary/10 text-primary"
};

const toastIcon: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = React.useCallback(
    (input: ToastInput) => {
      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const next: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        type: input.type ?? "info",
        durationMs: input.durationMs ?? 3600
      };

      setToasts((current) => [...current, next]);
      window.setTimeout(() => removeToast(id), next.durationMs);
    },
    [removeToast]
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (title, description) => showToast({ title, description, type: "success" }),
      error: (title, description) => showToast({ title, description, type: "error" }),
      info: (title, description) => showToast({ title, description, type: "info" })
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const Icon = toastIcon[toast.type];
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto rounded-lg border p-3 shadow-lg backdrop-blur",
                "bg-background/95 text-foreground",
                toastStyles[toast.type]
              )}
              role="status"
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-xs text-foreground/80">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="text-xs text-foreground/60 hover:text-foreground"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Dismiss notification"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

