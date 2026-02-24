import { redirect } from "next/navigation";

import { CategoriesAdminClient } from "@/components/admin/categories-admin-client";
import { requireBackofficeSession } from "@/lib/security/admin";

export default async function AdminCategoriesPage() {
  const access = await requireBackofficeSession("admin").catch(() => null);
  if (!access) {
    redirect("/admin");
  }

  return <CategoriesAdminClient />;
}
