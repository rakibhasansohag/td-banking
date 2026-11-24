import Link from "next/link";
import HeaderBox from "@/components/HeaderBox";
import AddDemoBank from "@/components/AddDemoBank";
import RecentTransactions from "@/components/RecentTransactions";
import RightSidebar from "@/components/RightSidebar";
import TotalBalanceBox from "@/components/TotalBalanceBox";
import {
  getAccountActivityPage,
  getBankingPageData,
} from "@/lib/banking-data";

type PageProps = { searchParams: Promise<{ id?: string | string[]; page?: string | string[] }> };

export default async function Home({ searchParams }: PageProps) {
  const query = await searchParams;
  const requestedId = Array.isArray(query.id) ? query.id[0] : query.id;
  const requestedPage = Number(Array.isArray(query.page) ? query.page[0] : query.page);
  const { user, accounts } = await getBankingPageData();
  const totalBalance = accounts.reduce((total, account) => total + account.currentBalance, 0);
  const selectedAccount = accounts.find((account) => account.id === requestedId) ?? accounts[0];
  const safePage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const activity = user && selectedAccount
    ? await getAccountActivityPage({ ownerUserId: user.$id, accountId: selectedAccount.id, page: safePage, limit: 10 })
    : { transactions: [], page: 1, totalPages: 0 };

  return (
    <section className="home min-w-0">
      <div className="home-content min-w-0">
        <header className="home-header">
          <div className="dashboard-heading">
            <HeaderBox
              title="Overview"
              subtext={`Welcome back, ${user?.firstName || "Guest"}. Here’s your account activity.`}
            />
            <div className="dashboard-actions">
              <AddDemoBank variant="ghost" />
              <Link href="/payment-transfer" className="dashboard-transfer-link">
                Transfer funds
              </Link>
            </div>
          </div>
          <TotalBalanceBox
            totalBanks={accounts.length}
            totalCurrentBalance={totalBalance}
          />
        </header>
        <RecentTransactions
          accounts={accounts}
          transactions={activity.transactions}
          selectedAccountId={selectedAccount?.id ?? ""}
          page={activity.page}
          totalPages={activity.totalPages}
        />
      </div>
      {user && (
        <RightSidebar
          user={user}
          transactions={activity.transactions}
          banks={accounts}
        />
      )}
    </section>
  );
}
