"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminDataTable } from "@/components/admin/data-table/AdminDataTable";
import { ConfirmDialog } from "@/components/admin/data-table/ConfirmDialog";
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
import { Switch } from "@/components/ui/switch";
import { requestJson } from "@/lib/http/client";
import { MESSAGES } from "@/lib/messages";
import { formatCurrency } from "@/lib/utils/cn";

type ZoneRow = {
  id: string;
  country: string;
  state: string;
  city: string;
  zone: string;
  fee: number;
  eta_text: string;
  active: boolean;
};

const zoneFormSchema = z.object({
  country: z.string().min(2, "Country is required."),
  state: z.string().min(2, "State is required."),
  city: z.string().min(2, "City is required."),
  zone: z.string().min(2, "Zone is required."),
  feeNaira: z.string().min(1, "Delivery fee is required."),
  eta_text: z.string().min(3, "ETA text is required."),
  active: z.boolean()
});

type ZoneFormValues = z.infer<typeof zoneFormSchema>;

const defaultFormValues: ZoneFormValues = {
  country: "Nigeria",
  state: "Lagos",
  city: "Lagos",
  zone: "",
  feeNaira: "0.00",
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

function buildZonesUrl(queryString: string) {
  return queryString ? `/api/admin/delivery-zones?${queryString}` : "/api/admin/delivery-zones";
}

export function ZonesAdminClient() {
  const toast = useToast();
  const query = useAdminTableQuery({ defaultPageSize: 10 });
  const activeFilter = query.getFilter("active");
  const stateFilter = query.getFilter("state");
  const cityFilter = query.getFilter("city");

  const [rows, setRows] = useState<ZoneRow[]>([]);
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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ZoneRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ZoneRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: defaultFormValues
  });

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await requestJson<PaginatedResponse<ZoneRow>>(
        buildZonesUrl(query.queryString),
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
      setError((caught as Error).message ?? "Could not load delivery zones.");
    } finally {
      setLoading(false);
    }
  }, [query.queryString]);

  useEffect(() => {
    loadRows().catch((caught) => {
      setError((caught as Error).message ?? "Could not load delivery zones.");
    });
  }, [loadRows]);

  const openCreateDrawer = useCallback(() => {
    setEditing(null);
    form.reset(defaultFormValues);
    setDrawerOpen(true);
  }, [form]);

  const openEditDrawer = useCallback((row: ZoneRow) => {
    setEditing(row);
    form.reset({
      country: row.country,
      state: row.state,
      city: row.city,
      zone: row.zone,
      feeNaira: formatKoboToNaira(row.fee),
      eta_text: row.eta_text,
      active: row.active
    });
    setDrawerOpen(true);
  }, [form]);

  async function onSubmit(values: ZoneFormValues) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        country: values.country,
        state: values.state,
        city: values.city,
        zone: values.zone,
        fee: parseNairaToKobo(values.feeNaira),
        eta_text: values.eta_text,
        active: values.active
      };

      if (editing) {
        await requestJson<{ zone: ZoneRow }>(
          "/api/admin/delivery-zones",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editing.id, ...payload })
          },
          { context: "admin" }
        );
        toast.success(MESSAGES.admin.zoneUpdated);
      } else {
        await requestJson<{ zone: ZoneRow }>(
          "/api/admin/delivery-zones",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          },
          { context: "admin" }
        );
        toast.success(MESSAGES.admin.zoneCreated);
      }
      setDrawerOpen(false);
      await loadRows();
    } catch (caught) {
      const message = (caught as Error).message ?? MESSAGES.admin.saveFailed;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await requestJson<{ ok: boolean }>(
        "/api/admin/delivery-zones",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: deleteTarget.id })
        },
        { context: "admin" }
      );
      toast.success(MESSAGES.admin.zoneDeleted);
      setDeleteTarget(null);
      await loadRows();
    } catch (caught) {
      const message = (caught as Error).message ?? MESSAGES.admin.saveFailed;
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<Array<TableColumn<ZoneRow>>>(
    () => [
      {
        key: "zone",
        header: "Zone",
        render: (row) => (
          <div>
            <p className="font-semibold text-primary">{row.zone}</p>
            <p className="text-xs text-muted-foreground">
              {row.city}, {row.state}
            </p>
          </div>
        )
      },
      {
        key: "country",
        header: "Country",
        hideOnMobile: true,
        render: (row) => row.country
      },
      {
        key: "fee",
        header: "Fee",
        className: "whitespace-nowrap",
        render: (row) => formatCurrency(row.fee, "NGN")
      },
      {
        key: "eta",
        header: "ETA",
        hideOnMobile: true,
        render: (row) => row.eta_text
      },
      {
        key: "active",
        header: "Status",
        render: (row) => (
          <Badge className={row.active ? "bg-green-700/15 text-green-700" : "bg-secondary text-muted-foreground"}>
            {row.active ? "Active" : "Inactive"}
          </Badge>
        )
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEditDrawer(row)} aria-label={`Edit ${row.zone}`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(row)}
              aria-label={`Delete ${row.zone}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
            </Button>
          </div>
        )
      }
    ],
    [openEditDrawer]
  );

  return (
    <>
      <AdminPageShell
        title="Delivery Zones"
        subtitle="Configure Lagos zones, fees, and ETA windows."
        actions={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Add Zone
          </Button>
        }
        toolbar={
          <div className="grid gap-2 md:grid-cols-5">
            <Input
              placeholder="Search zone, city, or state"
              value={query.searchInput}
              onChange={(event) => query.setSearchInput(event.target.value)}
            />
            <Input
              placeholder="State"
              value={stateFilter}
              onChange={(event) => query.setFilter("state", event.target.value || null)}
            />
            <Input
              placeholder="City"
              value={cityFilter}
              onChange={(event) => query.setFilter("city", event.target.value || null)}
            />
            <Select
              value={activeFilter || "all"}
              onChange={(event) => query.setFilter("active", event.target.value === "all" ? null : event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
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
          emptyTitle="No zones found"
          emptyDescription="Create a delivery zone to start quoting fees."
        />
      </AdminPageShell>

      <DrawerFormShell
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Delivery Zone" : "Add Delivery Zone"}
        description="Create or update city zones, fees, and ETA text."
      >
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zoneCountry">Country</Label>
              <Input id="zoneCountry" {...form.register("country")} />
              {form.formState.errors.country ? (
                <p className="text-xs text-destructive">{form.formState.errors.country.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zoneState">State</Label>
              <Input id="zoneState" {...form.register("state")} />
              {form.formState.errors.state ? (
                <p className="text-xs text-destructive">{form.formState.errors.state.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zoneCity">City</Label>
              <Input id="zoneCity" {...form.register("city")} />
              {form.formState.errors.city ? (
                <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zoneName">Zone</Label>
              <Input id="zoneName" {...form.register("zone")} />
              {form.formState.errors.zone ? (
                <p className="text-xs text-destructive">{form.formState.errors.zone.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zoneFee">Fee (NGN)</Label>
              <Input
                id="zoneFee"
                value={form.watch("feeNaira")}
                onChange={(event) => form.setValue("feeNaira", sanitizeMoneyInput(event.target.value), { shouldValidate: true })}
              />
              {form.formState.errors.feeNaira ? (
                <p className="text-xs text-destructive">{form.formState.errors.feeNaira.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zoneEta">ETA text</Label>
              <Input id="zoneEta" {...form.register("eta_text")} />
              {form.formState.errors.eta_text ? (
                <p className="text-xs text-destructive">{form.formState.errors.eta_text.message}</p>
              ) : null}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <Switch checked={form.watch("active")} onCheckedChange={(checked) => form.setValue("active", checked)} />
            Active
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </span>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </DrawerFormShell>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this zone?"
        description="Delete this delivery zone? This cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        destructive
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          handleDelete().catch(() => undefined);
        }}
      />
    </>
  );
}
