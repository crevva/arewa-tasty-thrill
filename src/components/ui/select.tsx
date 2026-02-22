import { cn } from "@/lib/utils/cn";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "focus-ring flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm",
        className
      )}
      {...props}
    />
  );
}
