"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

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
    load().catch(() => setError("Unable to load requests"));
  }, []);

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
              onClick={async () => {
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
              }}
            >
              Save
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
