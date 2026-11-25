import type { BankingAccount } from "@/lib/banking";
import { formatAmount } from "@/lib/utils";

const TotalBalanceBox = ({
  accounts,
  totalCurrentBalance,
}: {
  accounts: BankingAccount[];
  totalCurrentBalance: number;
}) => (
  <section className="total-balance flex-col items-stretch justify-center gap-4" aria-label="Total account balance">
    <div className="total-balance-copy">
      <p className="total-balance-label">Total balance</p>
      <div className="total-balance-amount">
        {formatAmount(totalCurrentBalance)}
      </div>
      <p className="total-balance-caption">
        Across {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
      </p>
    </div>
    {totalCurrentBalance > 0 && (
      <figure className="space-y-2">
        <figcaption className="text-xs font-medium text-gray-600">Balance by account</figcaption>
        <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
          {accounts.filter((account) => account.currentBalance > 0).map((account, index) => (
            <div key={account.id} className={index % 2 ? "bg-blue-300" : "bg-blue-600"} style={{ flex: account.currentBalance }} />
          ))}
        </div>
        <ul className="flex max-h-20 flex-wrap gap-x-3 gap-y-1 overflow-y-auto text-xs tabular-nums text-gray-700">
          {accounts.map((account) => (
            <li key={account.id}><span className="sr-only">Account ending in </span>···· {account.mask} <span className="font-medium">{formatAmount(account.currentBalance)}</span></li>
          ))}
        </ul>
      </figure>
    )}
  </section>
);

export default TotalBalanceBox;
