import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-muted/70", className)}
      {...props}
    />
  );
}

export { Skeleton };
