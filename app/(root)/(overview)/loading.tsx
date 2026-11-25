import { Skeleton, TransactionRowsSkeleton } from "@/components/ui/skeleton";

export default function LoadingOverview() {
  return (
    <section className="home" aria-busy="true" aria-label="Loading overview">
      <div className="home-content mx-auto max-w-7xl">
        <header className="home-header">
          <div className="dashboard-heading">
            <div className="space-y-2">
              <h1 className="header-box-title">Overview</h1>
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="h-11 w-32 max-sm:w-full" />
          </div>
          <div className="overview-summary grid gap-4">
            <div className="total-balance flex-col items-stretch justify-start gap-4">
              <div className="space-y-2">
                <p className="total-balance-label">Total balance</p>
                <Skeleton className="h-9 w-36" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">Balance by account</p>
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex items-center justify-between gap-4 border-b border-gray-100 py-2">
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-1.5 w-full" /></div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <p className="text-sm font-semibold text-gray-900">Money in and out</p>
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-14 w-full" />
              <div className="flex h-24 items-end justify-around gap-1">
                {["h-10", "h-16", "h-8", "h-12", "h-6", "h-14", "h-8"].map((height, index) => (
                  <Skeleton key={index} className={`${height} w-5`} />
                ))}
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </header>
        <div className="recent-transactions">
          <h2 className="recent-transactions-label">Recent transactions</h2>
          <div className="flex gap-4 border-b border-gray-200 py-3">
            <Skeleton className="h-12 w-36" />
            <Skeleton className="h-12 w-36" />
          </div>
          <TransactionRowsSkeleton />
        </div>
      </div>
    </section>
  );
}
