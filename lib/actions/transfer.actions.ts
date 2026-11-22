"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { BankingError, transferFunds } from "@/lib/banking";
import { getDatabase } from "@/lib/database";
import { getLoggedInUser } from "@/lib/actions/auth.actions";

const amountPattern = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/;
const transferSchema = z.object({
  sourceAccountId: z.string().trim().min(1).max(100),
  recipientCode: z.string().trim().min(12).max(100),
  recipientEmail: z.string().trim().email().max(254),
  amount: z.string().trim().regex(amountPattern, "Enter an amount with up to two decimal places."),
  note: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().uuid(),
});

export type TransferActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function parseAmountCents(value: string): number {
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new BankingError("INVALID_AMOUNT", "Enter an amount greater than zero.");
  return cents;
}

function messageFor(error: unknown): string {
  if (!(error instanceof BankingError)) return "Transfer could not be completed. Please try again.";
  switch (error.code) {
    case "ACCOUNT_NOT_FOUND": return "Choose one of your accounts as the source.";
    case "RECIPIENT_NOT_FOUND": return "That recipient share code was not found.";
    case "RECIPIENT_EMAIL_MISMATCH": return "The share code and recipient email do not match.";
    case "SELF_TRANSFER": return "Choose an account owned by someone else.";
    case "INSUFFICIENT_FUNDS": return "This account does not have enough funds for that transfer.";
    case "INVALID_AMOUNT": return "Enter a valid positive amount with up to two decimal places.";
    case "IDEMPOTENCY_CONFLICT": return "This transfer attempt was already used with different details. Please retry the form.";
    default: return "Transfer could not be completed. Please try again.";
  }
}

export async function submitBankingTransfer(input: unknown): Promise<TransferActionResult> {
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check the account, recipient details, and amount, then try again." };

  try {
    const user = await getLoggedInUser();
    if (!user) return { ok: false, message: "Sign in before sending a transfer." };

    const db = getDatabase();
    await transferFunds(db, {
      ownerUserId: user.$id,
      sourceAccountId: parsed.data.sourceAccountId,
      recipientCode: parsed.data.recipientCode,
      recipientEmail: parsed.data.recipientEmail.toLowerCase(),
      amountCents: parseAmountCents(parsed.data.amount),
      idempotencyKey: parsed.data.idempotencyKey,
      note: parsed.data.note || undefined,
    });

    revalidatePath("/");
    revalidatePath("/payment-transfer");
    revalidatePath("/transaction-history");
    return { ok: true, message: "Transfer sent successfully." };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}
