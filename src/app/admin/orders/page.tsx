import { OrdersAdminClient } from "@/components/admin/orders-admin-client";
import { requireBackofficeSession } from "@/lib/security/admin";

export default async function AdminOrdersPage() {
  await requireBackofficeSession("staff");

  return (
    <div className="space-y-5">
      <h1 className="h1">Orders</h1>
      <OrdersAdminClient />
    </div>
  );
}
