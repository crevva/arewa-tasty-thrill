import { redirect } from "next/navigation";

import { getSession } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { isAdminEmail } from "@/lib/security/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !isAdminEmail(session.email)) {
    redirect(`/auth/sign-in?returnTo=${encodeURIComponent("/admin")}`);
  }

  return (
    <div className="section-shell grid gap-6 lg:grid-cols-[230px_1fr]">
      <aside className="premium-card h-fit p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
        <AdminNav />
      </aside>
      <section>{children}</section>
    </div>
  );
}
