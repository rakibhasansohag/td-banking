import "server-only";

import { getDatabase } from "@/lib/database";
import {
  initializeBankingSchema,
  listAccountActivity,
  listBankingAccounts,
  type BankingAccount,
  type BankingActivity,
} from "@/lib/banking";
import { getLoggedInUser } from "@/lib/actions/auth.actions";
import type { AuthUserView } from "@/lib/auth.types";

export type UiAccount = BankingAccount & {
  appwriteItemId: string;
};

export type UiTransaction = BankingActivity & {
  type: "debit" | "credit";
  pending: boolean;
  accountId: string;
  image: string;
};

export async function getBankingPageData() {
  const user: AuthUserView | null = await getLoggedInUser();
  if (!user) return { user: null, accounts: [] as UiAccount[] };

  const db = getDatabase();
  initializeBankingSchema(db);
  const accounts = listBankingAccounts(db, user.$id).map((account) => ({
    ...account,
    appwriteItemId: account.id,
  }));
  return { user, accounts };
}

export async function getAccountActivityPage({
  ownerUserId,
  accountId,
  page = 1,
  limit = 10,
}: {
  ownerUserId: string;
  accountId: string;
  page?: number;
  limit?: number;
}) {
  const db = getDatabase();
  initializeBankingSchema(db);
  const result = listAccountActivity(db, { ownerUserId, accountId, page, limit });
  return {
    ...result,
    transactions: result.transactions.map((transaction) => ({
      ...transaction,
      type: transaction.direction,
      pending: false,
      accountId,
      image: "",
    })),
  };
}
