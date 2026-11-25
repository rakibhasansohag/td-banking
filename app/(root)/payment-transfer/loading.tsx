import HeaderBox from "@/components/HeaderBox";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingTransfer() {
  return (
    <section className="payment-transfer" aria-busy="true" aria-label="Loading payment transfer">
      <div className="w-full min-w-0">
        <HeaderBox title="Payment Transfer" subtext="Send funds between simulated TD Banking accounts." />
        <div className="pt-5">
          {[0, 1].map((field) => (
            <div key={field} className="payment-transfer_form-item border-t border-gray-200 py-5">
              <div className="payment-transfer_form-content">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48 max-w-full" />
              </div>
              <Skeleton className={field === 0 ? "h-14 w-full" : "h-20 w-full"} />
            </div>
          ))}
          <div className="payment-transfer_form-details">
            <h2 className="text-18 font-semibold text-gray-900">Bank account details</h2>
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          {[0, 1, 2].map((field) => (
            <div key={field} className="payment-transfer_form-item border-t border-gray-200 py-5">
              <div className="payment-transfer_form-content"><Skeleton className="h-4 w-36" /></div>
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="payment-transfer_btn-box"><Skeleton className="h-10 w-full" /></div>
        </div>
      </div>
    </section>
  );
}
