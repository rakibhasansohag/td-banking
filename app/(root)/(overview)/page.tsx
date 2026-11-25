import Link from "next/link";
import HeaderBox from "@/components/HeaderBox";
import AddDemoBank from "@/components/AddDemoBank";
import RecentTransactions from "@/components/RecentTransactions";
import TotalBalanceBox from "@/components/TotalBalanceBox";
import WeeklyCashFlow from "@/components/WeeklyCashFlow";
import {
  getAccountActivityPage,
  getBankingPageData,
  getWeeklyCashFlow,
} from "@/lib/banking-data";

type PageProps = { searchParams: Promise<{ id?: string | string[]; page?: string | string[] }> };

export default async function Home({ searchParams }: PageProps) {
  const query = await searchParams;
  const requestedId = Array.isArray(query.id) ? query.id[0] : query.id;
  const requestedPage = Number(Array.isArray(query.page) ? query.page[0] : query.page);
  const { user, accounts } = await getBankingPageData();
  const totalBalance = accounts.reduce((total, account) => total + Math.round(account.currentBalance * 100), 0) / 100;
  const selectedAccount = accounts.find((account) => account.id === requestedId) ?? accounts[0];
  const safePage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [activity, cashFlow] = user && selectedAccount
    ? await Promise.all([
      getAccountActivityPage({ ownerUserId: user.$id, accountId: selectedAccount.id, page: safePage, limit: 10 }),
      getWeeklyCashFlow(user.$id),
    ])
    : [{ transactions: [], page: 1, totalPages: 0 }, []];

  return (
    <section className="home min-w-0">
      <div className="home-content mx-auto min-w-0 max-w-7xl">
        <header className="home-header">
          <div className="dashboard-heading">
            <HeaderBox
              title="Overview"
              subtext="Balances and activity for your simulated accounts."
            />
            {selectedAccount && (
              <Link href="/payment-transfer" className="dashboard-transfer-link">
                Transfer funds
              </Link>
            )}
          </div>
          {selectedAccount && (
            <div className="overview-summary grid gap-4">
              <TotalBalanceBox accounts={accounts} totalCurrentBalance={totalBalance} />
              <WeeklyCashFlow days={cashFlow} />
            </div>
          )}
        </header>
        {selectedAccount ? <RecentTransactions
          accounts={accounts}
          transactions={activity.transactions}
          selectedAccountId={selectedAccount?.id ?? ""}
          page={activity.page}
          totalPages={activity.totalPages}
        /> : (
          <section className="max-w-xl space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
            <h2 className="text-xl font-semibold text-gray-900">Create your first demo account</h2>
            <p className="max-w-md text-sm leading-6 text-gray-600">Start with a simulated balance and sample transactions. You can explore the dashboard and try a transfer with demo money.</p>
            <AddDemoBank variant="primary" label="Create a demo account" />
          </section>
        )}
      </div>
    </section>
  );
}
