import HeaderBox from "@/components/HeaderBox";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingBanks() {
  return (
    <section className="flex min-w-0" aria-busy="true" aria-label="Loading bank accounts">
      <div className="my-banks min-w-0">
        <HeaderBox title="My Bank Accounts" subtext="Manage your simulated bank accounts." />
        <div className="space-y-4">
          <h2 className="header-2">Your accounts</h2>
          <div className="flex flex-wrap gap-6">
            {[0, 1].map((card) => (
              <div key={card} className="w-full max-w-80 space-y-3">
                <Skeleton className="h-[190px] rounded-[20px]" />
                <Skeleton className="h-5 w-36" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
