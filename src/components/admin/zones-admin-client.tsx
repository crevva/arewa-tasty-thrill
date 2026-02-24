"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { InlineNotice } from "@/components/feedback/inline-notice";
import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { MESSAGES } from "@/lib/messages";

type Zone = {
  id: string;
  country: string;
  state: string;
  city: string;
  zone: string;
  fee: number;
  eta_text: string;
  active: boolean;
};

const defaultForm = {
  country: "Nigeria",
  state: "Lagos",
  city: "Lagos",
  zone: "",
  fee: "0.00",
  eta_text: "",
  active: true
};

function sanitizeMoneyInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) {
    return "";
  }

  const [whole, ...decimals] = cleaned.split(".");
  if (decimals.length === 0) {
    return whole;
  }

  return `${whole}.${decimals.join("").slice(0, 2)}`;
}

function parseNairaToKobo(value: string) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

function formatKoboToNaira(value: number) {
  return (value / 100).toFixed(2);
}

export function ZonesAdminClient() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [feeDrafts, setFeeDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const toast = useToast();

  async function load() {
    const response = await fetch("/api/admin/delivery-zones");
    const payload = (await response.json()) as { zones?: Zone[]; error?: string };
    if (!response.ok || !payload.zones) {
      setError(payload.error ?? "Unable to load zones");
      return;
    }

    setZones(payload.zones);
    setFeeDrafts(
      Object.fromEntries(payload.zones.map((zone) => [zone.id, formatKoboToNaira(zone.fee)]))
    );
  }

  useEffect(() => {
    load()
      .catch(() => setError("Unable to load zones"))
      .finally(() => setInitialLoading(false));
  }, []);

  function setZoneFeeDraft(zoneId: string, rawValue: string) {
    const sanitized = sanitizeMoneyInput(rawValue);
    setFeeDrafts((current) => ({ ...current, [zoneId]: sanitized }));

    setZones((rows) =>
      rows.map((row) =>
        row.id === zoneId ? { ...row, fee: parseNairaToKobo(sanitized || "0") } : row
      )
    );
  }

  function isRowBusy(zoneId: string) {
    return busyKey === `save:${zoneId}` || busyKey === `delete:${zoneId}`;
  }

  if (initialLoading) {
    return (
      <div className="space-y-5">
        <div className="premium-card grid gap-3 p-4 md:grid-cols-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-md" />
          ))}
          <Skeleton className="h-10 w-36 rounded-md md:col-span-3" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="premium-card grid gap-3 p-4 md:grid-cols-3">
              {Array.from({ length: 7 }).map((__, innerIndex) => (
                <Skeleton key={innerIndex} className="h-10 w-full rounded-md" />
              ))}
              <div className="flex gap-2 md:col-span-3">
                <Skeleton className="h-10 w-24 rounded-md" />
                <Skeleton className="h-10 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form
        className="premium-card grid gap-3 p-4 md:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setBusyKey("create");
          try {
            const response = await fetch("/api/admin/delivery-zones", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...form,
                fee: parseNairaToKobo(form.fee || "0")
              })
            });
            const payload = (await response.json()) as { error?: string };
            if (!response.ok) {
              setError(payload.error ?? "Unable to create zone");
              return;
            }
            setForm(defaultForm);
            await load();
            toast.success(MESSAGES.admin.zoneCreated);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to create zone");
          } finally {
            setBusyKey(null);
          }
        }}
      >
        <Input disabled={busyKey === "create"} value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
        <Input disabled={busyKey === "create"} value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} />
        <Input disabled={busyKey === "create"} value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
        <Input disabled={busyKey === "create"} placeholder="Zone" value={form.zone} onChange={(event) => setForm((current) => ({ ...current, zone: event.target.value }))} required />
        <Input
          type="text"
          inputMode="decimal"
          placeholder="Fee (NGN)"
          value={form.fee}
          onChange={(event) => {
            const sanitized = sanitizeMoneyInput(event.target.value);
            setForm((current) => ({ ...current, fee: sanitized }));
          }}
          disabled={busyKey === "create"}
          required
        />
        <Input disabled={busyKey === "create"} placeholder="ETA text" value={form.eta_text} onChange={(event) => setForm((current) => ({ ...current, eta_text: event.target.value }))} required />
        <div className="flex items-center gap-2 text-xs">
          <Switch
            checked={form.active}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, active: checked }))}
            aria-label="Toggle active state for new delivery zone"
            disabled={busyKey === "create"}
          />
          <span>Active</span>
        </div>
        <div className="md:col-span-3">
          <Button type="submit" disabled={busyKey === "create"}>
            {busyKey === "create" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creating...
              </span>
            ) : (
              "Create zone"
            )}
          </Button>
        </div>
      </form>

      {error ? <InlineNotice type="error" title={error} /> : null}

      {zones.map((zone) => (
        <article key={zone.id} className="premium-card grid gap-3 p-4 md:grid-cols-3">
          <Input disabled={isRowBusy(zone.id)} value={zone.country} onChange={(event) => setZones((rows) => rows.map((row) => (row.id === zone.id ? { ...row, country: event.target.value } : row)))} />
          <Input disabled={isRowBusy(zone.id)} value={zone.state} onChange={(event) => setZones((rows) => rows.map((row) => (row.id === zone.id ? { ...row, state: event.target.value } : row)))} />
          <Input disabled={isRowBusy(zone.id)} value={zone.city} onChange={(event) => setZones((rows) => rows.map((row) => (row.id === zone.id ? { ...row, city: event.target.value } : row)))} />
          <Input disabled={isRowBusy(zone.id)} value={zone.zone} onChange={(event) => setZones((rows) => rows.map((row) => (row.id === zone.id ? { ...row, zone: event.target.value } : row)))} />
          <Input
            type="text"
            inputMode="decimal"
            value={feeDrafts[zone.id] ?? formatKoboToNaira(zone.fee)}
            disabled={isRowBusy(zone.id)}
            onChange={(event) => setZoneFeeDraft(zone.id, event.target.value)}
          />
          <Input disabled={isRowBusy(zone.id)} value={zone.eta_text} onChange={(event) => setZones((rows) => rows.map((row) => (row.id === zone.id ? { ...row, eta_text: event.target.value } : row)))} />
          <div className="flex items-center gap-2 text-xs">
            <Switch
              checked={zone.active}
              disabled={isRowBusy(zone.id)}
              onCheckedChange={(checked) =>
                setZones((rows) =>
                  rows.map((row) => (row.id === zone.id ? { ...row, active: checked } : row))
                )
              }
              aria-label={`Toggle active state for ${zone.zone}`}
            />
            <span>Active</span>
          </div>
          <div className="md:col-span-3 flex gap-2">
            <Button
              disabled={isRowBusy(zone.id)}
              onClick={async () => {
                setError(null);
                setBusyKey(`save:${zone.id}`);
                try {
                  const response = await fetch("/api/admin/delivery-zones", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(zone)
                  });
                  const payload = (await response.json()) as { error?: string };
                  if (!response.ok) {
                    setError(payload.error ?? "Unable to update zone");
                    return;
                  }
                  await load();
                  toast.success(MESSAGES.admin.zoneUpdated);
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Unable to update zone");
                } finally {
                  setBusyKey(null);
                }
              }}
            >
              {busyKey === `save:${zone.id}` ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              variant="destructive"
              disabled={isRowBusy(zone.id)}
              onClick={async () => {
                setError(null);
                setBusyKey(`delete:${zone.id}`);
                try {
                  const response = await fetch("/api/admin/delivery-zones", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: zone.id })
                  });
                  const payload = (await response.json()) as { error?: string };
                  if (!response.ok) {
                    setError(payload.error ?? "Unable to delete zone");
                    return;
                  }
                  await load();
                  toast.success(MESSAGES.admin.zoneDeleted);
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Unable to delete zone");
                } finally {
                  setBusyKey(null);
                }
              }}
            >
              {busyKey === `delete:${zone.id}` ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
