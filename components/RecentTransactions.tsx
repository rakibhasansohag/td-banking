"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import TransactionsTable from "./TransactionsTable";
import Loader from "./Loader";
import { Pagination } from "./Pagination";

const RecentTransactions = ({
  transactions = [],
  appwriteItemId,
  page = 1,
}: RecentTransactionsProps) => {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(page);
  const [cachedTransactions, setCachedTransactions] = useState<{
    [key: number]: Transaction[];
  }>({});

  const rowsPerPage = 10;
  const totalPages = Math.ceil(transactions.length / rowsPerPage);

  const indexOfLastTransaction = currentPage * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;

  const currentTransactions = useMemo(() => {
    return transactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
  }, [transactions, indexOfFirstTransaction, indexOfLastTransaction]);

  useEffect(() => {
    const fetchData = async () => {
      if (cachedTransactions[currentPage]) {
        // If transactions for the current page are already cached, use them
        setLoading(false);
        return;
      }

      setLoading(true);

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate an async fetch

      setCachedTransactions((prevCache) => ({
        ...prevCache,
        [currentPage]: currentTransactions,
      }));

      setLoading(false);
    };

    fetchData();
  }, [currentPage, currentTransactions, cachedTransactions]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
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

      {loading ? (
        <Loader />
      ) : (
        <div className="w-full space-y-4">
          <TransactionsTable
            transactions={cachedTransactions[currentPage] || []}
          />
          {totalPages > 1 && (
            <div className="my-4 w-full">
              <Pagination
                totalPages={totalPages}
                page={currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default RecentTransactions;
