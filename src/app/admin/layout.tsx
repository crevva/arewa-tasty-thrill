import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { requireBackofficeSession } from "@/lib/security/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await requireBackofficeSession("staff").catch(() => null);
  if (!access) {
    redirect(`/auth/sign-in?returnTo=${encodeURIComponent("/admin")}`);
  }

  return (
    <div className="section-shell grid gap-6 lg:grid-cols-[230px_1fr]">
      <aside className="premium-card h-fit p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
        <AdminNav role={access.role} />
      </aside>
      <section>{children}</section>
    </div>
  );
}
