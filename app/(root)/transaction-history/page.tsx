import AddDemoBank from "@/components/AddDemoBank";
import HeaderBox from "@/components/HeaderBox";
import HistoryAccountFilter from "@/components/HistoryAccountFilter";
import Pagination from "@/components/Pagination";
import TransactionsTable from "@/components/TransactionsTable";
import { getAccountActivityPage, getBankingPageData } from "@/lib/banking-data";
import { getLoggedInUser } from "@/lib/actions/auth.actions";
import { BankingError } from "@/lib/banking";
import { formatAmount } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<{ id?: string | string[]; page?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransactionHistory({ searchParams }: PageProps) {
  const query = await searchParams;
  const requestedId = first(query.id);
  const requestedPage = Number(first(query.page));
  const user = await getLoggedInUser();
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const accountId = requestedId && requestedId.trim() === requestedId && requestedId.length <= 200 ? requestedId : undefined;

  const [{ accounts }, activity] = await Promise.all([
    getBankingPageData(),
    user ? getAccountActivityPage({ ownerUserId: user.$id, accountId, page }).catch((error: unknown) => {
      if (!(error instanceof BankingError) || error.code !== "ACCOUNT_NOT_FOUND") throw error;
      return getAccountActivityPage({ ownerUserId: user.$id, page });
    }) : null,
  ]);

  if (accounts.length === 0 || !activity) {
    return (
      <div className="transactions min-w-0">
        <HeaderBox title="Transaction History" subtext="See activity for your simulated bank accounts." />
        <div className="mt-6 flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-14 text-gray-600">Add a simulated account to see sample activity.</p>
          <AddDemoBank />
        </div>
      </div>
    );
  }

  const account = accounts.find((item) => item.id === requestedId);
  const accountMasks = new Map(accounts.map(({ id, mask }) => [id, mask]));
  const balance = account?.currentBalance ?? accounts.reduce((sum, item) => sum + Math.round(item.currentBalance * 100), 0) / 100;

  return (
    <div className="transactions min-w-0">
      <div className="transactions-header">
        <HeaderBox title="Transaction History" subtext="See activity for your simulated bank accounts." />
      </div>
      <div className="space-y-6">
        <HistoryAccountFilter accounts={accounts.map(({ id, name, mask }) => ({ id, name, mask }))} selectedAccountId={account?.id} />
        {requestedId && !account && <p className="text-sm text-gray-600">That account is unavailable. Showing activity across your accounts.</p>}
        <div className="transactions-account min-w-0 border-transparent bg-white text-gray-900 ring-1 ring-gray-200">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="text-18 font-semibold">{account?.name ?? "All accounts"}</h2>
            <p className="text-14 text-gray-600">{account ? `Ending in ${account.mask}` : `Activity across ${accounts.length} simulated ${accounts.length === 1 ? "account" : "accounts"}`}</p>
          </div>
          <div className="flex flex-col gap-1 md:text-right">
            <p className="text-14 text-gray-600">{account ? "Current balance" : "Total balance"}</p>
            <p className="text-24 font-semibold tabular-nums">{formatAmount(balance)}</p>
          </div>
        </div>

        <section className="flex w-full min-w-0 flex-col gap-6">
          {activity.transactions.length ? (
            <div className="w-full min-w-0 overflow-x-auto">
              <TransactionsTable
                showAccount={!account}
                transactions={activity.transactions.map((transaction) => ({ ...transaction, accountMask: accountMasks.get(transaction.accountId) }))}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-gray-200 bg-white p-6 text-14 text-gray-600">
              {account ? "No activity yet for this account." : "No transactions across your accounts yet."}
            </p>
          )}
          {activity.totalPages > 1 && (
            <div className="my-4 w-full">
              <Pagination totalPages={activity.totalPages} page={activity.page} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
