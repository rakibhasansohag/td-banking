"use client";

import React, { useEffect, useState } from "react";
import BankCard from "@/components/BankCard";
import HeaderBox from "@/components/HeaderBox";
import { getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Loader from "@/components/Loader";

const MyBanks = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const loggedIn = await getLoggedInUser();
      setLoggedInUser(loggedIn);

      const accountsResponse = await getAccounts({ userId: loggedIn.$id });
      setAccounts(accountsResponse.data);

      setLoading(false);
    };

    fetchData();
  }, []);

  console.log({
    accounts,
    loggedInUser,
  });

  if (loading) {
    return <Loader />;
  }

  return (
    <section className="flex">
      <div className="my-banks">
        <HeaderBox
          title="My Bank Accounts"
          subtext="Effortlessly manage your banking activities."
        />

        <div className="space-y-4">
          <h2 className="header-2">Your cards</h2>
          <div className="flex flex-wrap gap-6">
            {accounts?.map((account) => (
              <BankCard
                key={account?.id}
                account={account}
                userName={loggedInUser?.firstName || "User"}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyBanks;
