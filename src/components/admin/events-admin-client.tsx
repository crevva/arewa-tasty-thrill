"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { InlineNotice } from "@/components/feedback/inline-notice";
import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MESSAGES } from "@/lib/messages";

type EventRequest = {
  id: string;
  name: string;
  phone: string;
  email: string;
  event_type: string;
  event_date: string | null;
  guests_estimate: number | null;
  status: string;
};

const statuses = ["new", "contacted", "proposal_sent", "confirmed", "closed"];

export function EventsAdminClient() {
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const toast = useToast();

  async function load() {
    const response = await fetch("/api/admin/event-requests");
    const payload = (await response.json()) as { requests?: EventRequest[]; error?: string };
    if (!response.ok || !payload.requests) {
      setError(payload.error ?? "Unable to load requests");
      return;
    }
    setRequests(payload.requests);
  }

  useEffect(() => {
    load()
      .catch(() => setError("Unable to load requests"))
      .finally(() => setInitialLoading(false));
  }, []);

  if (initialLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="premium-card space-y-3 p-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <InlineNotice type="error" title={error} /> : null}
      {requests.map((request) => (
        <article key={request.id} className="premium-card space-y-3 p-4">
          <div>
            <h2 className="font-semibold text-primary">{request.name}</h2>
            <p className="text-xs text-muted-foreground">
              {request.event_type} | {request.email} | {request.phone}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={request.status}
              disabled={busyKey === `save:${request.id}`}
              onChange={(event) =>
                setRequests((rows) =>
                  rows.map((row) =>
                    row.id === request.id ? { ...row, status: event.target.value } : row
                  )
                )
              }
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <Button
              disabled={busyKey === `save:${request.id}`}
              onClick={async () => {
                setError(null);
                setBusyKey(`save:${request.id}`);
                try {
                  const response = await fetch("/api/admin/event-requests", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: request.id, status: request.status })
                  });
                  const payload = (await response.json()) as { error?: string };
                  if (!response.ok) {
                    setError(payload.error ?? "Unable to update status");
                    return;
                  }
                  await load();
                  toast.success(MESSAGES.admin.eventUpdated);
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Unable to update status");
                } finally {
                  setBusyKey(null);
                }
              }}
            >
              {busyKey === `save:${request.id}` ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
