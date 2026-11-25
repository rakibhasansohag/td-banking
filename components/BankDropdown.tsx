"use client";

import { Wallet } from "lucide-react";
import type { ComponentPropsWithRef } from "react";

import type { BankingAccount } from "@/lib/banking";
import { formatAmount } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BankDropdownProps = Omit<ComponentPropsWithRef<typeof SelectTrigger>, "value"> & {
  accounts: BankingAccount[];
  value: string;
  onValueChange: (value: string) => void;
};

export const BankDropdown = ({ accounts, value, onValueChange, ...triggerProps }: BankDropdownProps) => {
  const selected = accounts.find((account) => account.id === value);

  return (
    <Select value={selected?.id ?? ""} onValueChange={onValueChange}>
      <SelectTrigger {...triggerProps} className="h-14 min-w-0 gap-3 rounded-lg border-gray-300 bg-white text-left text-gray-900 focus:ring-blue-500 aria-invalid:border-red-500 [&>span]:line-clamp-none [&>span]:min-w-0 [&>span]:flex-1 [&>svg]:shrink-0">
        <span aria-hidden="true" className="grid size-8 !flex-none shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700">
          <Wallet size={17} />
        </span>
        <SelectValue placeholder="Select an account">
          {selected && (
            <span className="block min-w-0 leading-tight">
              <span className="block truncate font-semibold">{selected.name}</span>
              <span className="mt-0.5 block text-xs text-gray-600">Ending in {selected.mask}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="start" collisionPadding={12} className="max-h-[min(24rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-24px)] rounded-xl border-gray-200 bg-white text-gray-900 shadow-lg">
        <SelectGroup>
          <SelectLabel className="px-3 py-2 text-xs font-medium text-gray-600">Your accounts</SelectLabel>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id} textValue={`${account.name} ${account.mask}`} className="min-h-12 cursor-pointer rounded-lg py-2 focus:bg-gray-100 focus:text-gray-900 data-[state=checked]:bg-blue-50 [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{account.name}</span>
                  <span className="block text-xs text-gray-600">Ending in {account.mask}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-700">{formatAmount(account.currentBalance)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
