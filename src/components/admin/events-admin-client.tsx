"use client";

import { Loader2, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminDataTable } from "@/components/admin/data-table/AdminDataTable";
import { DrawerFormShell } from "@/components/admin/data-table/DrawerFormShell";
import type { PaginatedResponse, TableColumn } from "@/components/admin/data-table/types";
import { useAdminTableQuery } from "@/components/admin/data-table/useAdminTableQuery";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { useToast } from "@/components/feedback/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requestJson } from "@/lib/http/client";
import { MESSAGES } from "@/lib/messages";

type EventRequestRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  event_type: string;
  event_date: string | null;
  guests_estimate: number | null;
  notes: string | null;
  status: string;
  created_at: string;
};

const EVENT_STATUSES = ["new", "contacted", "proposal_sent", "confirmed", "closed"] as const;

function buildEventsUrl(queryString: string) {
  return queryString ? `/api/admin/event-requests?${queryString}` : "/api/admin/event-requests";
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium"
  }).format(date);
}

function statusTone(status: string) {
  if (status === "confirmed") {
    return "bg-green-700/15 text-green-700";
  }
  if (status === "closed") {
    return "bg-secondary text-muted-foreground";
  }
  return "bg-amber-600/15 text-amber-700";
}

export function EventsAdminClient() {
  const toast = useToast();
  const query = useAdminTableQuery({ defaultPageSize: 10, defaultSort: "newest" });

  const [rows, setRows] = useState<EventRequestRow[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    from: 0,
    to: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRequest, setSelectedRequest] = useState<EventRequestRow | null>(null);
  const [nextStatus, setNextStatus] = useState<string>("new");
  const [savingStatus, setSavingStatus] = useState(false);

  const statusFilter = query.getFilter("status");
  const dateFrom = query.getFilter("dateFrom");
  const dateTo = query.getFilter("dateTo");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await requestJson<PaginatedResponse<EventRequestRow>>(
        buildEventsUrl(query.queryString),
        { method: "GET" },
        { context: "admin" }
      );

      setRows(payload.items);
      setMeta({
        page: payload.page,
        pageSize: payload.pageSize,
        total: payload.total,
        totalPages: payload.totalPages,
        from: payload.from ?? (payload.total ? (payload.page - 1) * payload.pageSize + 1 : 0),
        to: payload.to ?? Math.min(payload.page * payload.pageSize, payload.total)
      });
    } catch (caught) {
      setError((caught as Error).message ?? "Could not load event requests.");
    } finally {
      setLoading(false);
    }
  }, [query.queryString]);

  useEffect(() => {
    loadRows().catch((caught) => {
      setError((caught as Error).message ?? "Could not load event requests.");
    });
  }, [loadRows]);

  function openDrawer(row: EventRequestRow) {
    setSelectedRequest(row);
    setNextStatus(row.status);
  }

  async function saveStatus() {
    if (!selectedRequest) {
      return;
    }
    setSavingStatus(true);
    setError(null);
    try {
      await requestJson<{ eventRequest: EventRequestRow }>(
        "/api/admin/event-requests",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedRequest.id, status: nextStatus })
        },
        { context: "admin" }
      );
      toast.success(MESSAGES.admin.eventUpdated);
      setSelectedRequest(null);
      await loadRows();
    } catch (caught) {
      const message = (caught as Error).message ?? MESSAGES.admin.saveFailed;
      setError(message);
      toast.error(message);
    } finally {
      setSavingStatus(false);
    }
  }

  const columns = useMemo<Array<TableColumn<EventRequestRow>>>(
    () => [
      {
        key: "request",
        header: "Request",
        render: (row) => (
          <button
            type="button"
            className="text-left"
            onClick={() => openDrawer(row)}
            aria-label={`Open request from ${row.name}`}
          >
            <p className="font-semibold text-primary">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </button>
        )
      },
      {
        key: "eventType",
        header: "Event",
        hideOnMobile: true,
        render: (row) => row.event_type
      },
      {
        key: "eventDate",
        header: "Date",
        hideOnMobile: true,
        render: (row) => formatDate(row.event_date)
      },
      {
        key: "guests",
        header: "Guests",
        hideOnMobile: true,
        render: (row) => (row.guests_estimate ? row.guests_estimate.toLocaleString("en-NG") : "-")
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <Badge className={statusTone(row.status)}>{row.status.replaceAll("_", " ")}</Badge>
        )
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (row) => (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => openDrawer(row)} aria-label={`Edit ${row.name}`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )
      }
    ],
    []
  );

  return (
    <>
      <AdminPageShell
        title="Event Requests"
        subtitle="Track incoming catering and event leads in one queue."
        toolbar={
          <div className="grid gap-2 md:grid-cols-5">
            <Input
              placeholder="Search name, email, phone, event"
              value={query.searchInput}
              onChange={(event) => query.setSearchInput(event.target.value)}
            />
            <Select
              value={statusFilter || "all"}
              onChange={(event) => query.setFilter("status", event.target.value === "all" ? null : event.target.value)}
            >
              <option value="all">All statuses</option>
              {EVENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => query.setFilter("dateFrom", event.target.value || null)}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => query.setFilter("dateTo", event.target.value || null)}
            />
            <div className="flex items-center justify-end text-sm text-muted-foreground">
              Showing {meta.from}-{meta.to} of {meta.total}
            </div>
          </div>
        }
      >
        {error ? (
          <div className="mb-3">
            <InlineNotice type="error" title={error} />
          </div>
        ) : null}

        <AdminDataTable
          columns={columns}
          items={rows}
          loading={loading}
          rowKey={(row) => row.id}
          page={meta.page}
          pageSize={meta.pageSize}
          total={meta.total}
          totalPages={meta.totalPages}
          from={meta.from}
          to={meta.to}
          onPageChange={query.setPage}
          onPageSizeChange={query.setPageSize}
          emptyTitle="No event requests found"
          emptyDescription="New requests will appear here when customers submit the form."
        />
      </AdminPageShell>

      <DrawerFormShell
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        title={selectedRequest ? selectedRequest.name : "Request details"}
        description="Review request details and update status."
      >
        {selectedRequest ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-3 text-sm">
              <p>
                <span className="font-medium text-primary">Email:</span> {selectedRequest.email}
              </p>
              <p className="mt-1">
                <span className="font-medium text-primary">Phone:</span> {selectedRequest.phone}
              </p>
              <p className="mt-1">
                <span className="font-medium text-primary">Event type:</span> {selectedRequest.event_type}
              </p>
              <p className="mt-1">
                <span className="font-medium text-primary">Event date:</span> {formatDate(selectedRequest.event_date)}
              </p>
              <p className="mt-1">
                <span className="font-medium text-primary">Guests:</span>{" "}
                {selectedRequest.guests_estimate ? selectedRequest.guests_estimate.toLocaleString("en-NG") : "-"}
              </p>
              {selectedRequest.notes ? (
                <p className="mt-2 rounded-md bg-secondary/70 p-2 text-muted-foreground">{selectedRequest.notes}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventRequestStatus">Request status</Label>
              <Select
                id="eventRequestStatus"
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
                disabled={savingStatus}
              >
                {EVENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedRequest(null)} disabled={savingStatus}>
                Cancel
              </Button>
              <Button onClick={() => saveStatus().catch(() => undefined)} disabled={savingStatus}>
                {savingStatus ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving...
                  </span>
                ) : (
                  "Save status"
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </DrawerFormShell>
    </>
  );
}
