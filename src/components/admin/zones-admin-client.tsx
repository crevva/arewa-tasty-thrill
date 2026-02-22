"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  fee: 0,
  eta_text: "",
  active: true
};

export function ZonesAdminClient() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/delivery-zones");
    const payload = (await response.json()) as { zones?: Zone[]; error?: string };
    if (!response.ok || !payload.zones) {
      setError(payload.error ?? "Unable to load zones");
      return;
    }

    setZones(payload.zones);
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load zones"));
  }, []);

  return (
    <div className="space-y-5">
      <form
        className="premium-card grid gap-3 p-4 md:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const response = await fetch("/api/admin/delivery-zones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
          });
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) {
            setError(payload.error ?? "Unable to create zone");
            return;
          }
          setForm(defaultForm);
          await load();
        }}
      >
        <Input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
        <Input value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} />
        <Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
        <Input placeholder="Zone" value={form.zone} onChange={(event) => setForm((current) => ({ ...current, zone: event.target.value }))} required />
        <Input type="number" placeholder="Fee in kobo" value={form.fee} onChange={(event) => setForm((current) => ({ ...current, fee: Number(event.target.value) }))} required />
        <Input placeholder="ETA text" value={form.eta_text} onChange={(event) => setForm((current) => ({ ...current, eta_text: event.target.value }))} required />
        <div className="md:col-span-3">
          <Button type="submit">Create zone</Button>
        </div>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {zones.map((zone) => (
        <article key={zone.id} className="premium-card grid gap-3 p-4 md:grid-cols-3">
          <Input value={zone.country} onChange={(event) => setZones((rows) => rows.map((row) => (row.id === zone.id ? { ...row, country: event.target.value } : row)))} />
          <Input value={zone.state} onChange={(event) => setZones((rows) => rows.map((row) => (row.id === zone.id ? { ...row, state: event.target.value } : row)))} />
          <Input value={zone.city} onChange={(event) => setZones((rows) => rows.map((row) => (row.id === zone.id ? { ...row, city: event.target.value } : row)))} />
          <Input value={zone.zone} onChange={(event) => setZones((rows) => rows.map((row) => (row.id === zone.id ? { ...row, zone: event.target.value } : row)))} />
          <Input type="number" value={zone.fee} onChange={(event) => setZones((rows) => rows.map((row) => (row.id === zone.id ? { ...row, fee: Number(event.target.value) } : row)))} />
          <Input value={zone.eta_text} onChange={(event) => setZones((rows) => rows.map((row) => (row.id === zone.id ? { ...row, eta_text: event.target.value } : row)))} />
          <div className="md:col-span-3 flex gap-2">
            <Button
              onClick={async () => {
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
              }}
            >
              Save
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
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
              }}
            >
              Delete
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
