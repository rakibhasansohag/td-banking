"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankTabItem } from "./BankTabItem";
import TransactionsTable from "./TransactionsTable";
import Pagination from "./Pagination";
import type { BankingAccount } from "@/lib/banking";

type RecentTransactionsProps = {
  accounts: BankingAccount[];
  transactions: {
    id: string;
    name: string;
    amount: number;
    date: string;
    type: string;
    pending: boolean;
    paymentChannel: string;
    category: string;
  }[];
  selectedAccountId: string;
  page: number;
  totalPages: number;
};

export default function RecentTransactions({
  accounts,
  transactions,
  selectedAccountId,
  page,
  totalPages,
}: RecentTransactionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const changeAccount = (accountId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", accountId);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/?${query}` : "/", { scroll: false });
  };

  return (
    <section className="recent-transactions min-w-0">
      <header className="flex items-center justify-between gap-3">
        <h2 className="recent-transactions-label">Recent transactions</h2>
        {selectedAccountId && (
          <Link href={`/transaction-history/?id=${selectedAccountId}`} className="view-all-btn">
            View all
          </Link>
        )}
      </header>

      {accounts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-14 text-gray-600">
          Add a simulated account to see sample balances and transactions.
        </p>
      ) : (
        <Tabs value={selectedAccountId} onValueChange={changeAccount} activationMode="manual" className="w-full min-w-0">
          <TabsList aria-label="Accounts for recent transactions" className="recent-transactions-tablist max-w-full overflow-x-auto justify-start rounded-none bg-transparent p-0 h-auto">
            {accounts.map((account) => (
              <TabsTrigger
                key={account.id}
                value={account.id}
                className="h-auto rounded-none bg-transparent p-0 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <BankTabItem account={account} selectedAccountId={selectedAccountId} />
              </TabsTrigger>
            ))}
          </TabsList>
          {accounts.map((account) => (
            <TabsContent value={account.id} key={account.id} className="min-w-0 space-y-4">
              {transactions.length ? (
                <div className="w-full min-w-0 overflow-x-auto">
                  <TransactionsTable transactions={transactions} />
                </div>
              ) : (
                <p className="rounded-xl border border-gray-200 bg-white p-5 text-14 text-gray-600">
                  No activity yet for this account.
                </p>
              )}
              {totalPages > 1 && (
                <div className="my-4 w-full">
                  <Pagination totalPages={totalPages} page={page} />
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </section>
  );
}
