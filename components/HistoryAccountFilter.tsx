"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AccountOption = { id: string; name: string; mask: string };

export default function HistoryAccountFilter({ accounts, selectedAccountId }: {
  accounts: AccountOption[];
  selectedAccountId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function changeAccount(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("id");
    else params.set("id", value);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/transaction-history?${query}` : "/transaction-history", { scroll: false });
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5 sm:max-w-80">
      <label htmlFor="history-account-filter" className="text-sm font-medium text-gray-700">Filter by account</label>
      <Select value={selectedAccountId ?? "all"} onValueChange={changeAccount}>
        <SelectTrigger id="history-account-filter" className="gap-2 rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-blue-500 [&>svg]:shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start" collisionPadding={12} className="max-h-[min(24rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] rounded-xl border-gray-200 bg-white text-gray-900 shadow-lg">
          <SelectItem value="all" className="py-2.5 focus:bg-gray-100 data-[state=checked]:bg-blue-50">All accounts</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id} className="py-2.5 focus:bg-gray-100 data-[state=checked]:bg-blue-50">
              Ending in {account.mask} · {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
