"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { ChevronDown } from "lucide-react";

type AccountOption = { id: string; name: string; mask: string };

export default function HistoryAccountFilter({ accounts, selectedAccountId }: {
  accounts: AccountOption[];
  selectedAccountId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [accountId, setAccountId] = useOptimistic(selectedAccountId ?? "all");

  function changeAccount(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("id");
    else params.set("id", value);
    params.delete("page");
    const query = params.toString();
    startTransition(() => {
      setAccountId(value);
      router.push(query ? `/transaction-history?${query}` : "/transaction-history", { scroll: false });
    });
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5 sm:max-w-80">
      <label htmlFor="history-account-filter" className="text-sm font-medium text-gray-700">Filter by account</label>
      <div className="relative">
        <select id="history-account-filter" value={accountId} onChange={(event) => changeAccount(event.target.value)} aria-busy={pending} className="h-11 w-full appearance-none truncate rounded-lg border border-gray-300 bg-white pl-3 pr-9 text-base text-gray-900 focus-visible:outline-2 focus-visible:outline-blue-600 sm:text-sm">
          <option value="all">All accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              Ending in {account.mask} · {account.name}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
      </div>
      <p role="status" className="min-h-4 text-xs text-gray-600">{pending ? "Updating transactions…" : ""}</p>
    </div>
  );
}
