import { CategoriesAdminClient } from "@/components/admin/categories-admin-client";

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-5">
      <h1 className="h1">Categories</h1>
      <CategoriesAdminClient />
    </div>
  );
}
