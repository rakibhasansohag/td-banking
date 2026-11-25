"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEventHandler } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import type { BankingAccount } from "@/lib/banking";
import { submitBankingTransfer } from "@/lib/actions/transfer.actions";
import { BankDropdown } from "./BankDropdown";
import RecipientSearch from "./RecipientSearch";
import type { TransferRecipient } from "@/lib/actions/recipient.actions";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const amountPattern = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/;
const formSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  name: z.string().trim().max(120, "Keep the transfer note under 120 characters.").optional(),
  amount: z.string().trim()
    .regex(amountPattern, "Enter an amount such as 5, 5.2, or 5.20.")
    .refine((value) => value.replace(".", "").replace(/^0+/, "") !== "", "Amount must be greater than zero."),
  senderBank: z.string().min(1, "Select a source account."),
  sharableId: z.string().trim().min(12, "Enter the recipient's share code.").max(100),
});

type FormValues = z.infer<typeof formSchema>;
const transferKeyStorage = "td-banking-transfer-idempotency-key";

const PaymentTransferForm = ({ accounts }: { accounts: BankingAccount[] }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const requestKey = useRef<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      amount: "",
      senderBank: accounts[0]?.id ?? "",
      sharableId: "",
    },
  });

  const submit = async (data: FormValues) => {
    if (isLoading) return;
    setIsLoading(true);
    setStatus(null);
    if (!requestKey.current) {
      const savedKey = sessionStorage.getItem(transferKeyStorage);
      requestKey.current = savedKey && z.string().uuid().safeParse(savedKey).success
        ? savedKey
        : crypto.randomUUID();
      sessionStorage.setItem(transferKeyStorage, requestKey.current);
    }

    try {
      const result = await submitBankingTransfer({
        sourceAccountId: data.senderBank,
        recipientCode: data.sharableId,
        recipientEmail: data.email,
        amount: data.amount,
        note: data.name?.trim() || undefined,
        idempotencyKey: requestKey.current,
      });

      setStatus(result);
      if (result.ok) {
        form.reset({ name: "", email: "", amount: "", senderBank: accounts[0]?.id ?? "", sharableId: "" });
        requestKey.current = null;
        sessionStorage.removeItem(transferKeyStorage);
        router.refresh();
      }
    } catch {
      setStatus({ ok: false, message: "Transfer could not be completed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    void form.handleSubmit(submit)(event);
  };

  function selectRecipient({ email, code }: TransferRecipient) {
    form.setValue("email", email, { shouldValidate: true, shouldDirty: true });
    form.setValue("sharableId", code, { shouldValidate: true, shouldDirty: true });
  }

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="flex flex-col" aria-busy={isLoading}>
        <FormField
          control={form.control}
          name="senderBank"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">Select Source Bank</FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Select the account you want to transfer funds from.
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <BankDropdown
                      accounts={accounts}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">Transfer Note (Optional)</FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Add a short note for the recipient, up to 120 characters.
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Textarea placeholder="Write a short note here" className="input-class" maxLength={120} {...field} />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_form-details">
          <h2 className="text-18 font-semibold text-gray-900">Bank account details</h2>
          <p className="text-16 font-normal text-gray-600">Type in either field to find a previous recipient. For a first transfer, ask for their email and the share code from My Banks.</p>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item py-5">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">Recipient&apos;s Email Address</FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl><RecipientSearch type="email" autoComplete="off" placeholder="name@example.com" maxLength={254} className="input-class" onSelectRecipient={selectRecipient} {...field} /></FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sharableId"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-5 pt-6">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">Recipient Share Code</FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl><RecipientSearch autoComplete="off" placeholder="Enter the recipient's share code" maxLength={100} className="input-class" onSelectRecipient={selectRecipient} {...field} /></FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="border-y border-gray-200">
              <div className="payment-transfer_form-item py-5">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">Amount (USD)</FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl><Input inputMode="decimal" autoComplete="off" placeholder="ex: 5.00" className="input-class" {...field} /></FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_btn-box">
          <Button type="submit" className="payment-transfer_btn" disabled={isLoading}>
            {isLoading ? <><Loader2 size={20} className="animate-spin" /> &nbsp; Sending...</> : "Transfer Funds"}
          </Button>
        </div>
        {status && (
          <p role="status" aria-live="polite" className={`mt-4 text-14 ${status.ok ? "text-green-700" : "text-red-600"}`}>
            {status.message}
          </p>
        )}
      </form>
    </Form>
  );
};

export default PaymentTransferForm;
