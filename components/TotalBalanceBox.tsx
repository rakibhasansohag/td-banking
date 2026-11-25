import type { BankingAccount } from "@/lib/banking";
import { formatAmount } from "@/lib/utils";

const TotalBalanceBox = ({
  accounts,
  totalCurrentBalance,
}: {
  accounts: BankingAccount[];
  totalCurrentBalance: number;
}) => (
  <section className="total-balance flex-col items-stretch justify-start gap-4" aria-label="Total account balance">
    <div className="total-balance-copy">
      <p className="total-balance-label">Total balance</p>
      <div className="total-balance-amount">
        {formatAmount(totalCurrentBalance)}
      </div>
      <p className="total-balance-caption">
        Across {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
      </p>
    </div>
    <figure>
      <figcaption className="mb-1 text-sm font-semibold text-gray-900">Balance by account</figcaption>
      <ul className="divide-y divide-gray-100 text-sm tabular-nums">
        {accounts.map((account) => (
          <li key={account.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
            <div className="min-w-0">
              <p className="text-gray-700">Ending in {account.mask}</p>
              <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${totalCurrentBalance > 0 ? account.currentBalance / totalCurrentBalance * 100 : 0}%` }} />
              </div>
            </div>
            <span className="text-right font-semibold text-gray-900">{formatAmount(account.currentBalance)}</span>
          </li>
        ))}
      </ul>
    </figure>
  </section>
);

export default TotalBalanceBox;
