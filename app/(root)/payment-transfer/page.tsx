"use client";

import React, { useEffect, useState } from "react";
import HeaderBox from "@/components/HeaderBox";
import PaymentTransferForm from "@/components/PaymentTransferForm";
import Loader from "@/components/Loader";
import { getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { toast } from "sonner"; // Importing toast from sonner for displaying error messages

const Transfer = () => {
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true); // State to track initial load
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
        handleValidationErrors(err); // Handle specific validation errors
        console.log(err);
        setLoading(false); // Set loading to false even on error
      } finally {
        setInitialLoad(false);
      }
    };

    fetchData();
  }, []);

  // Function to handle validation errors
  const handleValidationErrors = (err: any) => {
    if (
      err?.response?.status === 400 &&
      err?.response?.data?.code === "ValidationError"
    ) {
      const validationErrors = err?.response?.data?._embedded?.errors || [];
      const errorMessage = validationErrors
        .map((error: any) => error.message)
        .join("\n");
      console.log("----------TRANSFER ERROR---------", errorMessage);
      toast.error(`Transfer fund failed: ${errorMessage}`); // Display error message in a toast
    } else {
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred")
      );
    }
  };

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
