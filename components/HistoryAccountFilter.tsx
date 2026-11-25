"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { AccountPicker, type AccountPickerOption } from "@/components/AccountPicker";

export default function HistoryAccountFilter({ accounts, selectedAccountId }: {
  accounts: AccountPickerOption[];
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
      <AccountPicker id="history-account-filter" showAll accounts={accounts} value={accountId} onValueChange={changeAccount} aria-busy={pending} />
      <p role="status" className="min-h-4 text-xs text-gray-600">{pending ? "Updating transactions…" : ""}</p>
    </div>
  );
}
