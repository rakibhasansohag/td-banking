"use client";

import { cn, formatAmount } from "@/lib/utils";
import type { BankingAccount } from "@/lib/banking";

export const BankTabItem = ({ account, selectedAccountId }: {
  account: BankingAccount;
  selectedAccountId?: string;
}) => {
  const isActive = selectedAccountId === account.id;

  return (
    <div className={cn("banktab-item", { "is-active": isActive })}>
      <span className="banktab-account-name">{account.name}</span>
      <span className="banktab-account-mask">···· {account.mask}</span>
      <span className="text-sm font-semibold tabular-nums text-gray-900">{formatAmount(account.currentBalance)}</span>
    </div>
  );
};
