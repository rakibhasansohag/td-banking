"use client";

import { Check, ChevronDown, Search, Wallet } from "lucide-react";
import { useState, type ComponentPropsWithRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatAmount } from "@/lib/utils";

export type AccountPickerOption = { id: string; name: string; mask: string; currentBalance?: number };
const PAGE_SIZE = 20;

type AccountPickerProps = Omit<ComponentPropsWithRef<typeof Button>, "value"> & {
  accounts: AccountPickerOption[];
  value: string;
  onValueChange: (id: string) => void;
  showAll?: boolean;
  showWallet?: boolean;
};

export function AccountPicker({ accounts, value, onValueChange, showAll, showWallet, className, ...triggerProps }: AccountPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const options: AccountPickerOption[] = showAll ? [{ id: "all", name: "All accounts", mask: "" }, ...accounts] : accounts;
  const selected = options.find((account) => account.id === value);
  const term = query.trim().toLowerCase();
  const matches = term ? options.filter(({ name, mask }) => name.toLowerCase().includes(term) || mask.includes(term)) : options;
  const lastPage = Math.max(0, Math.ceil(matches.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const start = currentPage * PAGE_SIZE;
  const visible = open ? matches.slice(start, start + PAGE_SIZE) : [];

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) { setQuery(""); setPage(0); }
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button {...triggerProps} type="button" variant="outline" className={cn("h-auto min-h-11 w-full min-w-0 justify-start gap-3 rounded-lg border-gray-300 bg-white px-3 py-2 text-left text-gray-900 focus-visible:ring-blue-600 aria-invalid:border-red-500", className)}>
          {showWallet && <span className="grid size-8 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700"><Wallet aria-hidden="true" size={17} /></span>}
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate font-medium">{selected?.name ?? "Select an account"}</span>
            {selected?.mask && <span className="mt-0.5 block text-xs text-gray-600">Ending in {selected.mask}</span>}
          </span>
          <ChevronDown aria-hidden="true" size={16} className={cn("shrink-0 text-gray-500 motion-safe:transition-transform", open && "rotate-180")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={showAll ? "Filter by account" : "Choose a source account"}
        className="max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-content-available-width)] overflow-y-auto"
      >
        <div className="relative">
          <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input aria-label="Search accounts" placeholder="Name or last four digits" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className="h-11 border-gray-300 pl-9 text-base sm:text-sm" />
        </div>
        <ul key={`${term}:${currentPage}`} aria-label="Matching accounts" className="mt-2 max-h-[min(40dvh,16rem)] space-y-1 overflow-y-auto overscroll-contain">
          {visible.map((account) => (
            <li key={account.id}>
              <Button type="button" variant="ghost" aria-current={account.id === value || undefined} onClick={() => { onValueChange(account.id); setOpen(false); }} className="h-auto min-h-11 w-full justify-start gap-2 px-2 py-2 text-left text-gray-900 hover:bg-gray-100 aria-[current=true]:bg-blue-50">
                <span className="size-4 shrink-0 text-blue-700">{account.id === value && <Check aria-hidden="true" size={16} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{account.name}</span>
                  {account.mask && <span className="block text-xs text-gray-600">Ending in {account.mask}</span>}
                </span>
                {account.currentBalance !== undefined && <span className="shrink-0 text-xs tabular-nums text-gray-700">{formatAmount(account.currentBalance)}</span>}
              </Button>
            </li>
          ))}
        </ul>
        {matches.length === 0 && <p role="status" className="py-3 text-sm text-gray-600">No matching accounts.</p>}
        {lastPage > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
            <p role="status" className="mr-auto text-xs text-gray-600">{start + 1}–{start + visible.length} of {matches.length}</p>
            <Button type="button" variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button>
            <Button type="button" variant="outline" size="sm" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
