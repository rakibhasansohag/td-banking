import BankCard from "@/components/BankCard";
import HeaderBox from "@/components/HeaderBox";
import AddDemoBank from "@/components/AddDemoBank";
import { getBankingPageData } from "@/lib/banking-data";

export default async function MyBanks() {
  const { user, accounts } = await getBankingPageData();
  const userName = user?.name || "User";

  return (
    <section className="flex min-w-0">
      <div className="my-banks min-w-0">
        <HeaderBox
          title="My Bank Accounts"
          subtext="Manage your simulated bank accounts."
        />

        <div className="space-y-4">
          <h2 className="header-2">Your accounts</h2>
          {accounts.length ? (
            <div className="flex flex-wrap gap-6">
              {accounts.map((account) => (
                <BankCard key={account.id} account={account} userName={userName} />
              ))}
            </div>
          ) : (
            <div className="flex max-w-xl flex-col items-start gap-4 rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-14 text-gray-600">
                Add a demo account to explore balances and sample activity. These accounts use simulated data.
              </p>
              <AddDemoBank />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
