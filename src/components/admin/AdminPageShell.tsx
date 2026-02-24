import type { ReactNode } from "react";

type AdminPageShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
};

export function AdminPageShell({
  title,
  subtitle,
  actions,
  toolbar,
  children
}: AdminPageShellProps) {
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      {toolbar ? <section className="premium-card p-3">{toolbar}</section> : null}
      <section>{children}</section>
    </div>
  );
}

