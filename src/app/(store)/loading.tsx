import { Skeleton } from "@/components/ui/skeleton";

export default function StoreLoading() {
  return (
    <section className="section-shell space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="premium-card space-y-4 p-4">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

