import "server-only";

import { getDatabase } from "@/lib/database";
import {
  listAccountActivity,
  listBankingAccounts,
  type BankingAccount,
  type BankingActivity,
} from "@/lib/banking";
import { getLoggedInUser } from "@/lib/actions/auth.actions";
import type { AuthUserView } from "@/lib/auth.types";

export type UiTransaction = BankingActivity & {
  type: "debit" | "credit";
  pending: boolean;
  image: string;
};

export type CashFlowDay = { day: string; moneyIn: number; moneyOut: number };

export async function getWeeklyCashFlow(ownerUserId: string): Promise<CashFlowDay[]> {
  const result = await getDatabase().query<{ day: string; incoming: string; outgoing: string }>(`
    WITH period AS (
      SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date AS today
    ), daily AS (
      SELECT (entry.created_at AT TIME ZONE 'Asia/Dhaka')::date AS day,
        SUM(entry.signed_cents) FILTER (WHERE entry.signed_cents > 0) AS incoming,
        SUM(-entry.signed_cents) FILTER (WHERE entry.signed_cents < 0) AS outgoing
      FROM banking_accounts account
      JOIN banking_ledger_entries entry ON entry.account_id = account.id
      CROSS JOIN period
      WHERE account.owner_user_id = $1
        AND entry.created_at >= ((period.today - 6)::timestamp AT TIME ZONE 'Asia/Dhaka')
        AND entry.created_at < ((period.today + 1)::timestamp AT TIME ZONE 'Asia/Dhaka')
      GROUP BY 1
    )
    SELECT to_char(period.today - days.offset_days, 'YYYY-MM-DD') AS day,
      COALESCE(daily.incoming, 0)::text AS incoming,
      COALESCE(daily.outgoing, 0)::text AS outgoing
    FROM period CROSS JOIN generate_series(0, 6) AS days(offset_days)
    LEFT JOIN daily ON daily.day = period.today - days.offset_days
    ORDER BY day`, [ownerUserId]);

  return result.rows.map(({ day, incoming, outgoing }) => ({
    day,
    moneyIn: Number(incoming) / 100,
    moneyOut: Number(outgoing) / 100,
  }));
}

export async function getBankingPageData() {
  const user: AuthUserView | null = await getLoggedInUser();
  if (!user) return { user: null, accounts: [] as BankingAccount[] };

  const db = getDatabase();
  const accounts = await listBankingAccounts(db, user.$id);
  return { user, accounts };
}

export async function getAccountActivityPage({
  ownerUserId,
  accountId,
  page = 1,
  limit = 10,
}: {
  ownerUserId: string;
  accountId?: string;
  page?: number;
  limit?: number;
}) {
  const db = getDatabase();
  const result = await listAccountActivity(db, { ownerUserId, accountId, page, limit });
  return {
    ...result,
    transactions: result.transactions.map((transaction) => ({
      ...transaction,
      type: transaction.direction,
      pending: false,
      image: "",
    })),
  };
}
