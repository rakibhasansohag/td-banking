"use server";

import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/database";
import { createBankingAccount, initializeBankingSchema } from "@/lib/banking";
import { getLoggedInUser } from "@/lib/actions/auth.actions";

export async function addDemoBankAccount(accountIdempotencyKey: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountIdempotencyKey)) {
    throw new Error("Invalid account request. Please try again.");
  }
  const user = await getLoggedInUser();
  if (!user) throw new Error("Sign in to add a demo bank account.");

  const db = getDatabase();
  initializeBankingSchema(db);
  const account = createBankingAccount(db, {
    ownerUserId: user.$id,
    accountIdempotencyKey,
  });
  revalidatePath("/");
  revalidatePath("/my-banks");
  revalidatePath("/transaction-history");
  return { accountId: account.id };
}
