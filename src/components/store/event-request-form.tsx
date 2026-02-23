"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { eventRequestSchema } from "@/lib/validators/event-request";

export function EventRequestForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm({
    resolver: zodResolver(eventRequestSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      event_date: "",
      event_type: "",
      guests_estimate: undefined,
      notes: ""
    }
  });

  return (
    <form
      className="premium-card space-y-4 p-6"
      onSubmit={form.handleSubmit(async (values) => {
        setBusy(true);
        setMessage(null);
        setError(null);
        try {
          const response = await fetch("/api/event-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
          });

          const payload = (await response.json()) as { id?: string; error?: string };
          if (!response.ok || !payload.id) {
            setError(payload.error ?? "Failed to submit request");
            return;
          }

          setMessage("Request submitted. Our team will contact you shortly.");
          form.reset();
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Failed to submit request");
        } finally {
          setBusy(false);
        }
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" disabled={busy} {...form.register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" disabled={busy} {...form.register("phone")} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" disabled={busy} {...form.register("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_date">Event date</Label>
          <Input id="event_date" type="date" disabled={busy} {...form.register("event_date")} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event_type">Event type</Label>
          <Input id="event_type" placeholder="Birthday, wedding, corporate..." disabled={busy} {...form.register("event_type")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guests_estimate">Estimated guests</Label>
          <Input
            id="guests_estimate"
            type="number"
            min={1}
            max={5000}
            step={1}
            inputMode="numeric"
            disabled={busy}
            {...form.register("guests_estimate", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" disabled={busy} {...form.register("notes")} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      <Button className="w-full" type="submit" disabled={busy}>
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Submitting request...
          </span>
        ) : (
          "Submit request"
        )}
      </Button>
    </form>
  );
}
