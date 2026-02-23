import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { requireBackofficeSession } from "@/lib/security/admin";
import { loadAnalytics } from "@/server/admin/analytics";

export default async function AdminDashboardPage() {
  await requireBackofficeSession("staff");
  const analytics = await loadAnalytics();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="h1">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Operational overview of revenue, orders, and delivery demand.</p>
      </header>
      <AnalyticsCharts
        revenueRows={analytics.revenueRows.map((row) => ({
          day: new Date(row.day as unknown as string).toISOString().slice(0, 10),
          revenue: Number(row.revenue ?? 0)
        }))}
        statusRows={analytics.statusRows.map((row) => ({
          status: row.status,
          count: Number(row.count ?? 0)
        }))}
        topProducts={analytics.topProducts.map((row) => ({
          name: row.name,
          qty: Number(row.qty ?? 0)
        }))}
        zoneDemand={analytics.zoneDemand.map((row) => ({
          zone: row.zone,
          orders_count: Number(row.orders_count ?? 0)
        }))}
      />
    </div>
  );
}
