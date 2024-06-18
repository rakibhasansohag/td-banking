"use client";

import React, { useEffect, useState } from "react";
import HeaderBox from "@/components/HeaderBox";
import PaymentTransferForm from "@/components/PaymentTransferForm";
import Loader from "@/components/Loader";
import { getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";

const Transfer = () => {
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true); // New state to track initial load
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await getLoggedInUser();
        setLoggedInUser(user);

        if (user) {
          const accountsResponse = await getAccounts({ userId: user.$id });
          setAccounts(accountsResponse.data);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error("An unknown error occurred"));
        }
      } finally {
        setLoading(false);
        setInitialLoad(false); // Set initialLoad to false after first load
      }
    };

    fetchData();
  }, []);

  if (loading && initialLoad) {
    return <Loader />;
  }

  if (error) {
    return <div className="error">Error loading data: {error.message}</div>;
  }

  return (
    <section className="payment-transfer flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <HeaderBox
          title="Payment Transfer"
          subtext="Please provide any specific details or notes related to the payment transfer"
        />
        <section className="size-full pt-5">
          {accounts.length > 0 ? (
            <PaymentTransferForm accounts={accounts} />
          ) : (
            <div className="w-full text-center text-gray-500">
              <p className="text-lg">You have no bank accounts linked.</p>
              <p>Please add a bank account to initiate a transfer.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default Transfer;
