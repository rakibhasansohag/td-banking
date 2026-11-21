"use client";

import { cn } from "@/lib/utils";
import type { BankingAccount } from "@/lib/banking";

export const BankTabItem = ({ account, selectedAccountId }: {
  account: BankingAccount;
  selectedAccountId?: string;
}) => {
  const isActive = selectedAccountId === account.id;

  return (
    <div
      className={cn("banktab-item", {
        " border-blue-600": isActive,
      })}
    >
      <p
        className={cn(`text-16 line-clamp-1 flex-1 font-medium text-gray-500`, {
          " text-blue-600": isActive,
        })}
      >
        {account.name}
      </p>
    </div>
  );
};
