import HeaderBox from "@/components/HeaderBox";
import { Skeleton, TransactionRowsSkeleton } from "@/components/ui/skeleton";

export default function LoadingHistory() {
  return (
    <section className="transactions" aria-busy="true" aria-label="Loading transaction history">
      <HeaderBox title="Transaction History" subtext="See activity for your simulated bank accounts." />
      <div className="space-y-6">
        <div className="transactions-account border-transparent bg-gray-100">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-16 w-full md:w-36" />
        </div>
        <TransactionRowsSkeleton />
      </div>
    </section>
  );
}
