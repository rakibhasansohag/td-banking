"use client";

import HeaderBox from "@/components/HeaderBox";
import { Pagination } from "@/components/Pagination";
import TransactionsTable from "@/components/TransactionsTable";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { formatAmount } from "@/lib/utils";
import React, { useEffect, useState } from "react";

import Loader from "@/components/Loader";

interface TransactionHistoryProps {
  searchParams: {
    id?: string;
    page?: string;
  };
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  searchParams: { id, page },
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTransactions, setCurrentTransactions] = useState<Transaction[]>(
    []
  );
  const [currentPage, setCurrentPage] = useState<number>(Number(page) || 1);
  const [selectedTab, setSelectedTab] = useState<string | undefined>(id);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const loggedIn = await getLoggedInUser();
      const accountsResponse = await getAccounts({ userId: loggedIn.$id });
      if (!accountsResponse) return;

      const fetchedAccounts = accountsResponse.data;
      setAccounts(fetchedAccounts);

      const initialAppwriteItemId = id || fetchedAccounts[0]?.appwriteItemId;
      const accountData = await getAccount({
        appwriteItemId: initialAppwriteItemId,
      });
      if (!accountData) return;

      setSelectedTab(initialAppwriteItemId);
      setCurrentPage(Number(page) || 1);
      setCurrentTransactions(accountData.transactions);
      setLoading(false);
    };

    fetchData();
  }, [id, page]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (loading && currentTransactions.length === 0) {
    return <Loader />; // Display loader only if data is still loading and no transactions are fetched yet
  }

  // Find the selected account based on selectedTab
  const account = accounts.find((acc) => acc.appwriteItemId === selectedTab);

  if (!account) {
    return null; // Handle case where account is not found
  }

  const rowsPerPage = 10;
  const totalTransactions = currentTransactions.length; // Adjust based on actual structure
  const totalPages = Math.ceil(totalTransactions / rowsPerPage);

  const indexOfLastTransaction = currentPage * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
  const currentTransactionsPage = currentTransactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  );

  return (
    <div className="transactions">
      <div className="transactions-header">
        <HeaderBox
          title="Transaction History"
          subtext="See your bank details and transactions."
        />
      </div>

      <div className="space-y-6">
        <div className="transactions-account">
          <div className="flex flex-col gap-2">
            <h2 className="text-18 font-bold text-white">{account.name}</h2>
            <p className="text-14 text-blue-25">{account.officialName}</p>
            <p className="text-14 font-semibold tracking-[1.1px] text-white">
              ●●●● ●●●● ●●●● {account.mask}
            </p>
          </div>

          <div className="transactions-account-balance">
            <p className="text-14">Current balance</p>
            <p className="text-24 text-center font-bold">
              {formatAmount(account.currentBalance)}
            </p>
          </div>
        </div>

        <section className="flex w-full flex-col gap-6">
          <TransactionsTable transactions={currentTransactionsPage} />

          {totalPages > 1 && (
            <div className="my-4 w-full">
              <Pagination
                totalPages={totalPages}
                page={currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default TransactionHistory;
