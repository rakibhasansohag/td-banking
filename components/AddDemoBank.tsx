"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { addDemoBankAccount } from "@/lib/actions/banking-ui.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const selectClass = "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus-visible:outline-2 focus-visible:outline-blue-600 sm:text-sm";

  function changeOpen(next: boolean) {
    if (submitting.current) return;
    setError("");
    setOpen(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
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
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-gray-950/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[61] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-xl sm:p-6">
          <Dialog.Title className="text-xl font-semibold text-gray-900">Create a demo account</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-gray-600">Use the defaults or customize the account. The balance and activity use simulated money.</Dialog.Description>
          <form onSubmit={addAccount} className="mt-5 space-y-4" aria-busy={isPending}>
            <fieldset disabled={isPending} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor={`${id}-name`} className="block text-sm font-medium text-gray-900">Account nickname <span className="font-normal text-gray-500">(optional)</span></label>
                <Input id={`${id}-name`} name="name" maxLength={80} placeholder="e.g. Everyday spending" className="h-11 rounded-lg border-gray-300 text-base sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${id}-type`} className="block text-sm font-medium text-gray-900">Account type</label>
                <select id={`${id}-type`} name="type" defaultValue="checking" className={selectClass}>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${id}-balance`} className="block text-sm font-medium text-gray-900">Starting balance</label>
                <select id={`${id}-balance`} name="balance" defaultValue="1250" className={selectClass}>
                  <option value="250">$250</option>
                  <option value="1250">$1,250</option>
                  <option value="5000">$5,000</option>
                </select>
              </div>
            </fieldset>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Dialog.Close asChild><Button type="button" variant="outline" disabled={isPending}>Cancel</Button></Dialog.Close>
              <Button type="submit" disabled={isPending} className="bg-blue-700 text-white hover:bg-blue-800">{isPending ? "Creating…" : "Create account"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
