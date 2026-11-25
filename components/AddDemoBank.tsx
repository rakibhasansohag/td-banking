"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { addDemoBankAccount } from "@/lib/actions/banking-ui.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function AddDemoBank({ variant = "default", collapsed = false, label = "Add demo bank" }: { variant?: "default" | "primary" | "ghost" | "sidebar"; collapsed?: boolean; label?: string }) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const submitting = useRef(false);
  const requests = useRef(new Map<string, string>());

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const balance = form.get("balance");
    const options = {
      name: String(form.get("name") ?? "").trim(),
      subtype: form.get("type") === "savings" ? "savings" as const : "checking" as const,
      openingBalanceCents: balance === "250" ? 25_000 as const : balance === "5000" ? 500_000 as const : 125_000 as const,
    };
    const fingerprint = JSON.stringify(options);
    const key = requests.current.get(fingerprint) ?? crypto.randomUUID();
    requests.current.set(fingerprint, key);
    submitting.current = true;
    setIsPending(true);
    setError("");
    try {
      await addDemoBankAccount(key, options);
      requests.current.clear();
      setOpen(false);
      toast.success("Demo bank account added");
      router.refresh();
    } catch {
      setError("Couldn’t create the account. Try again.");
    } finally {
      submitting.current = false;
      setIsPending(false);
    }
  }

  const selectClass = "h-11 rounded-lg border-gray-300 bg-white text-base text-gray-900 focus:ring-blue-600 sm:text-sm";
  const menuClass = "z-[70] w-[var(--radix-select-trigger-width)] rounded-lg border-gray-200 bg-white text-gray-900 shadow-lg";

  function changeOpen(next: boolean) {
    if (submitting.current) return;
    setError("");
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          aria-label={label}
          title={collapsed ? label : undefined}
          className={cn(
            variant === "sidebar" ? "sidebar-link h-auto w-full bg-transparent p-3 hover:bg-gray-50" : `bank-action-${variant}`,
            variant === "sidebar" && (collapsed ? "justify-center gap-0 px-0" : "justify-start"),
          )}
        >
          <Image src="/icons/connect-bank.svg" alt="" width={28} height={28} className={variant === "sidebar" ? "size-7 shrink-0" : "size-6"} />
          <span className={cn(collapsed ? "sidebar-action-label" : "text-[16px] font-semibold", variant === "primary" ? "text-white" : "text-black-2")}>
            {label}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
          <DialogTitle className="text-xl font-semibold text-gray-900">Create a demo account</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-gray-600">Use the defaults or customize the account. The balance and activity use simulated money.</DialogDescription>
          <form onSubmit={addAccount} className="mt-5 space-y-4" aria-busy={isPending}>
            <fieldset disabled={isPending} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor={`${id}-name`} className="block text-sm font-medium text-gray-900">Account nickname <span className="font-normal text-gray-500">(optional)</span></label>
                <Input id={`${id}-name`} name="name" maxLength={80} placeholder="e.g. Everyday spending" className="h-11 rounded-lg border-gray-300 text-base sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${id}-type`} className="block text-sm font-medium text-gray-900">Account type</label>
                <Select name="type" defaultValue="checking" disabled={isPending}>
                  <SelectTrigger id={`${id}-type`} className={selectClass}><SelectValue /></SelectTrigger>
                  <SelectContent align="start" className={menuClass}>
                    <SelectItem value="checking" className="focus:bg-gray-100">Checking</SelectItem>
                    <SelectItem value="savings" className="focus:bg-gray-100">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${id}-balance`} className="block text-sm font-medium text-gray-900">Starting balance</label>
                <Select name="balance" defaultValue="1250" disabled={isPending}>
                  <SelectTrigger id={`${id}-balance`} className={selectClass}><SelectValue /></SelectTrigger>
                  <SelectContent align="start" className={menuClass}>
                    <SelectItem value="250" className="focus:bg-gray-100">$250</SelectItem>
                    <SelectItem value="1250" className="focus:bg-gray-100">$1,250</SelectItem>
                    <SelectItem value="5000" className="focus:bg-gray-100">$5,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isPending}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isPending} className="bg-blue-700 text-white hover:bg-blue-800">{isPending ? "Creating…" : "Create account"}</Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}
