"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase } from "@/lib/database";
import { createBankingAccount } from "@/lib/banking";
import { getLoggedInUser } from "@/lib/actions/auth.actions";

const demoAccountOptions = z.object({
  name: z.string().trim().max(80).optional(),
  subtype: z.enum(["checking", "savings"]).optional(),
  openingBalanceCents: z.union([z.literal(25_000), z.literal(125_000), z.literal(500_000)]).optional(),
});

export async function addDemoBankAccount(accountIdempotencyKey: string, options?: z.input<typeof demoAccountOptions>) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountIdempotencyKey)) {
    throw new Error("Invalid account request. Please try again.");
  }
  const user = await getLoggedInUser();
  if (!user) throw new Error("Sign in to add a demo bank account.");
  const parsed = demoAccountOptions.safeParse(options ?? {});
  if (!parsed.success) throw new Error("Choose valid demo account details and try again.");

  const db = getDatabase();
  const account = await createBankingAccount(db, {
    ownerUserId: user.$id,
    accountIdempotencyKey,
    name: parsed.data.name || (parsed.data.subtype === "savings" ? "TD Demo Savings" : undefined),
    subtype: parsed.data.subtype,
    openingBalanceCents: parsed.data.openingBalanceCents,
  });
  revalidatePath("/");
  revalidatePath("/my-banks");
  revalidatePath("/transaction-history");
  return { accountId: account.id };
}
