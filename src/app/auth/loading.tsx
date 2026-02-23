import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <section className="section-shell">
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </section>
  );
}

