import { redirect } from "next/navigation";

import AddDemoBank from "@/components/AddDemoBank";
import HeaderBox from "@/components/HeaderBox";
import PaymentTransferForm from "@/components/PaymentTransferForm";
import { listBankingAccounts } from "@/lib/banking";
import { getLoggedInUser } from "@/lib/actions/auth.actions";
import { getDatabase } from "@/lib/database";

export default async function Transfer() {
  const user = await getLoggedInUser();
  if (!user) redirect("/sign-in");

  const db = getDatabase();
  const accounts = await listBankingAccounts(db, user.$id);

  return (
    <section className="payment-transfer">
      <div className="w-full min-w-0">
        <HeaderBox
          title="Payment Transfer"
          subtext="Send funds between simulated TD Banking accounts."
        />
        <section className="size-full pt-5">
          {accounts.length > 0 ? (
            <PaymentTransferForm accounts={accounts.map(({ id, name, mask, currentBalance }) => ({ id, name, mask, currentBalance }))} />
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">
              <p className="text-lg">Add a simulated account before sending a transfer.</p>
              <AddDemoBank />
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
