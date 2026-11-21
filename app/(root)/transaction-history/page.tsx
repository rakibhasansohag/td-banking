import AddDemoBank from "@/components/AddDemoBank";
import HeaderBox from "@/components/HeaderBox";
import Pagination from "@/components/Pagination";
import TransactionsTable from "@/components/TransactionsTable";
import { getAccountActivityPage, getBankingPageData } from "@/lib/banking-data";
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
  const { user, accounts } = await getBankingPageData();

  if (accounts.length === 0 || !user) {
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

  const account = accounts.find((item) => item.id === requestedId) ?? accounts[0];
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const activity = await getAccountActivityPage({
    ownerUserId: user.$id,
    accountId: account.id,
    page,
    limit: 10,
  });

  return (
    <div className="transactions min-w-0">
      <div className="transactions-header">
        <HeaderBox title="Transaction History" subtext="See activity for your simulated bank accounts." />
      </div>
      <div className="space-y-6">
        <div className="transactions-account min-w-0">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="text-18 font-bold text-white">{account.name}</h2>
            <p className="text-14 text-blue-25">Simulated account · {account.subtype}</p>
            <p className="text-14 font-semibold tracking-[1.1px] text-white">
              ●●●● ●●●● ●●●● {account.mask}
            </p>
          </div>
          <div className="transactions-account-balance">
            <p className="text-14">Current balance</p>
            <p className="text-24 text-center font-bold">{formatAmount(account.currentBalance)}</p>
          </div>
        </div>

        <section className="flex w-full min-w-0 flex-col gap-6">
          {activity.transactions.length ? (
            <div className="w-full min-w-0 overflow-x-auto">
              <TransactionsTable transactions={activity.transactions} />
            </div>
          ) : (
            <p className="rounded-xl border border-gray-200 bg-white p-6 text-14 text-gray-600">
              No activity yet for this account.
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
