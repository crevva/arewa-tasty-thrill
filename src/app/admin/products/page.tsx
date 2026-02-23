import { redirect } from "next/navigation";

import { ProductsAdminClient } from "@/components/admin/products-admin-client";
import { requireBackofficeSession } from "@/lib/security/admin";

export default async function AdminProductsPage() {
  const access = await requireBackofficeSession("admin").catch(() => null);
  if (!access) {
    redirect("/admin");
  }

  return (
    <div className="space-y-5">
      <h1 className="h1">Products</h1>
      <ProductsAdminClient />
    </div>
  );
}
