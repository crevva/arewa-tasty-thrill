import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="section-shell grid gap-6 lg:grid-cols-[230px_1fr]">
      <aside className="premium-card h-fit space-y-3 p-4">
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full rounded-md" />
        ))}
      </aside>

      <section className="space-y-5">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="premium-card space-y-4 p-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-64 w-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

