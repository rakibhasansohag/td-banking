"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankTabItem } from "./BankTabItem";
import BankInfo from "./BankInfo";
import TransactionsTable from "./TransactionsTable";
import Pagination from "./Pagination";
import { useState, useEffect } from "react";
import Loader from "./Loader";

const RecentTransactions = ({
  accounts,
  transactions = [],
  appwriteItemId,
  page = 1,
}: RecentTransactionsProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(page);
  const [currentTab, setCurrentTab] = useState(appwriteItemId);

  const rowsPerPage = 10;
  const totalPages = Math.ceil(transactions.length / rowsPerPage);

  const indexOfLastTransaction = currentPage * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;

  const currentTransactions = transactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  );

  useEffect(() => {
    // Check if data has been loaded before
    const dataLoaded = sessionStorage.getItem("dataLoaded");
    if (!dataLoaded) {
      // Simulate a data fetching delay
      setTimeout(() => {
        setIsLoading(false);
        sessionStorage.setItem("dataLoaded", "true");
      }, 500);
    } else {
      setIsLoading(false);
    }
  }, []);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleTabChange = (newTab: string) => {
    setCurrentTab(newTab);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  return (
    <section className="recent-transactions">
      <header className="flex items-center justify-between">
        <h2 className="recent-transactions-label">Recent transactions</h2>
        <Link
          href={`/transaction-history/?id=${appwriteItemId}`}
          className="view-all-btn"
        >
          View all
        </Link>
      </header>

      {isLoading ? (
        <Loader />
      ) : (
        <Tabs
          defaultValue={currentTab}
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="recent-transactions-tablist">
            {accounts?.map((account: Account) => (
              <TabsTrigger key={account.id} value={account.appwriteItemId}>
                <BankTabItem
                  key={account.id}
                  account={account}
                  appwriteItemId={appwriteItemId}
                />
              </TabsTrigger>
            ))}
          </TabsList>

          {accounts?.map((account: Account) => (
            <TabsContent
              value={account.appwriteItemId}
              key={account.id}
              className="space-y-4"
            >
              <BankInfo
                account={account}
                appwriteItemId={appwriteItemId}
                type="full"
              />

              <TransactionsTable transactions={currentTransactions} />

              {totalPages > 1 && (
                <div className="my-4 w-full">
                  <Pagination
                    totalPages={totalPages}
                    page={currentPage}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </section>
  );
};

export default RecentTransactions;
