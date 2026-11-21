"use client";

import Image from "next/image";
import { useState } from "react";

import type { BankingAccount } from "@/lib/banking";
import { formatAmount } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";

type BankDropdownProps = {
  accounts: BankingAccount[];
  setValue?: (field: "senderBank", value: string) => void;
  otherStyles?: string;
};

export const BankDropdown = ({ accounts = [], setValue, otherStyles }: BankDropdownProps) => {
  const [selectedId, setSelectedId] = useState(accounts[0]?.id ?? "");
  const selected = accounts.find((account) => account.id === selectedId) ?? accounts[0];

  const handleBankChange = (id: string) => {
    setSelectedId(id);
    setValue?.("senderBank", id);
  };

  return (
    <Select value={selected?.id ?? ""} onValueChange={handleBankChange}>
      <SelectTrigger className={`flex w-full gap-3 bg-white md:w-[300px] ${otherStyles}`}>
        <Image src="/icons/credit-card.svg" width={20} height={20} alt="account" />
        <p className="line-clamp-1 w-full text-left">{selected?.name ?? "Select an account"}</p>
      </SelectTrigger>
      <SelectContent className={`w-full bg-white md:w-[300px] ${otherStyles}`} align="end">
        <SelectGroup>
          <SelectLabel className="py-2 font-normal text-gray-500">Select an account to transfer from</SelectLabel>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id} className="cursor-pointer border-t">
              <div className="flex flex-col">
                <p className="text-16 font-medium">{account.name}</p>
                <p className="text-14 font-medium text-blue-600">{formatAmount(account.currentBalance)}</p>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
