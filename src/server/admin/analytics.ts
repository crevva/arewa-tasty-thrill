import { getDb } from "@/lib/db";

export async function loadAnalytics() {
  const db = getDb();

  const [orders, orderItems, zones] = await Promise.all([
    db.selectFrom("orders").select(["created_at", "status", "total", "delivery_zone_id"]).execute(),
    db
      .selectFrom("order_items")
      .innerJoin("products", "products.id", "order_items.product_id")
      .select(["products.name", "order_items.qty", "order_items.line_total"])
      .execute(),
    db.selectFrom("delivery_zones").select(["id", "zone"]).execute()
  ]);

  const revenueByDay = new Map<string, number>();
  const statusByName = new Map<string, number>();
  const zoneById = new Map(zones.map((zone) => [zone.id, zone.zone]));
  const zoneDemandMap = new Map<string, number>();

  for (const order of orders) {
    statusByName.set(order.status, (statusByName.get(order.status) ?? 0) + 1);

    const zoneName = zoneById.get(order.delivery_zone_id) ?? "Unknown";
    zoneDemandMap.set(zoneName, (zoneDemandMap.get(zoneName) ?? 0) + 1);

    if (order.status === "paid") {
      const dayKey = order.created_at.toISOString().slice(0, 10);
      revenueByDay.set(dayKey, (revenueByDay.get(dayKey) ?? 0) + order.total);
    }
  }

  const productTotals = new Map<string, { qty: number; revenue: number }>();
  for (const item of orderItems) {
    const current = productTotals.get(item.name) ?? { qty: 0, revenue: 0 };
    current.qty += item.qty;
    current.revenue += item.line_total;
    productTotals.set(item.name, current);
  }

  const revenueRows = [...revenueByDay.entries()]
    .map(([day, revenue]) => ({ day, revenue }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const statusRows = [...statusByName.entries()].map(([status, count]) => ({ status, count }));

  const topProducts = [...productTotals.entries()]
    .map(([name, metrics]) => ({ name, qty: metrics.qty, revenue: metrics.revenue }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const zoneDemand = [...zoneDemandMap.entries()]
    .map(([zone, orders_count]) => ({ zone, orders_count }))
    .sort((a, b) => b.orders_count - a.orders_count);

  return {
    revenueRows,
    statusRows,
    topProducts,
    zoneDemand
  };
}
