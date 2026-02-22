import { OrdersAdminClient } from "@/components/admin/orders-admin-client";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-5">
      <h1 className="h1">Orders</h1>
      <OrdersAdminClient />
    </div>
  );
}
