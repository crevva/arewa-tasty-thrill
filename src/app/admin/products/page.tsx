import { ProductsAdminClient } from "@/components/admin/products-admin-client";

export default function AdminProductsPage() {
  return (
    <div className="space-y-5">
      <h1 className="h1">Products</h1>
      <ProductsAdminClient />
    </div>
  );
}
