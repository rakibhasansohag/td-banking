import dynamic from "next/dynamic";
import Loader from "@/components/Loader";
import { Suspense } from "react";

const HeaderBox = dynamic(() => import("@/components/HeaderBox"), {
  suspense: true,
  loading: () => <Loader />,
});
const RecentTransactions = dynamic(
  () => import("@/components/RecentTransactions"),
  {
    suspense: true,
    loading: () => <Loader />,
  }
);
const RightSidebar = dynamic(() => import("@/components/RightSidebar"), {
  suspense: true,
  loading: () => <Loader />,
});
const TotalBalanceBox = dynamic(() => import("@/components/TotalBalanceBox"), {
  suspense: true,
  loading: () => <Loader />,
});

import { getAccount, getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";

const Home = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({
    userId: loggedIn?.$id,
  });

  if (!accounts) return;

  const accountsData = accounts?.data;
  const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId;

  const account = await getAccount({ appwriteItemId });

  return (
    <Suspense fallback={<Loader />}>
      <section className="home">
        <div className="home-content">
          <header className="home-header">
            <HeaderBox
              type="greeting"
              title="Welcome"
              user={loggedIn?.firstName || "Guest"}
              subtext="Access and manage your account and transactions efficiently."
            />

            <TotalBalanceBox
              accounts={accountsData}
              totalBanks={accounts?.totalBanks}
              totalCurrentBalance={accounts?.totalCurrentBalance}
            />
          </header>

          <RecentTransactions
            accounts={accountsData}
            transactions={account?.transactions}
            appwriteItemId={appwriteItemId}
            page={currentPage}
          />
        </div>

        <RightSidebar
          user={loggedIn}
          transactions={account?.transactions}
          banks={accountsData?.slice(0, 2)}
        />
      </section>
    </Suspense>
  );
};

export default Home;
