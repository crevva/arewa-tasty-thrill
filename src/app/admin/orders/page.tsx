import { OrdersAdminClient } from "@/components/admin/orders-admin-client";
import { requireBackofficeSession } from "@/lib/security/admin";

export default async function AdminOrdersPage() {
  await requireBackofficeSession("staff");

  return <OrdersAdminClient />;
}
