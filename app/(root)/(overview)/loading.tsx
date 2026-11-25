import { Skeleton, TransactionRowsSkeleton } from "@/components/ui/skeleton";

export default function LoadingOverview() {
  return (
    <section className="home" aria-busy="true" aria-label="Loading overview">
      <div className="home-content">
        <header className="home-header">
          <div className="dashboard-heading">
            <div className="space-y-2">
              <h1 className="header-box-title">Overview</h1>
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <div className="dashboard-actions">
              <Skeleton className="h-11 w-36 max-sm:w-full" />
              <Skeleton className="h-11 w-32 max-sm:w-full" />
            </div>
          </div>
          <div className="total-balance">
            <div className="space-y-2">
              <p className="total-balance-label">Total balance</p>
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="size-14 rounded-full sm:size-16" />
          </div>
        </header>
        <div className="recent-transactions">
          <h2 className="recent-transactions-label">Recent transactions</h2>
          <div className="flex gap-4 border-b border-gray-200 py-3">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-8 w-36" />
          </div>
          <Skeleton className="h-24 rounded-xl" />
          <TransactionRowsSkeleton />
        </div>
      </div>
      <aside className="right-sidebar" aria-hidden="true">
        <Skeleton className="h-14" />
        <Skeleton className="h-36" />
        <Skeleton className="h-28" />
      </aside>
    </section>
  );
}
