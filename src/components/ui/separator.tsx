import { cn } from "@/lib/utils/cn";

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn("border-border", className)} {...props} />;
}
