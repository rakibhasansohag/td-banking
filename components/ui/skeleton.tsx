import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded-md bg-gray-200 motion-safe:animate-pulse", className)} />;
}

export function TransactionRowsSkeleton() {
  return (
    <div aria-hidden="true" className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      <div className="flex justify-between rounded-t-xl bg-gray-50 px-4 py-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="w-1/2 space-y-2">
            <Skeleton className="h-4 w-full max-w-40" />
            <Skeleton className="h-3 w-3/4 bg-gray-100 lg:hidden" />
          </div>
          <Skeleton className="hidden h-3 w-20 lg:block" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
