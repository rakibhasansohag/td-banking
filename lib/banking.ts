import { randomBytes, randomInt, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

export type BankingDatabase = Pool;

const SCHEMA_VERSION = 1;
const MAX_CENTS = 99_999_999_999;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const SCHEMA_LOCK_KEY = "td-banking-schema-migration";

type DbRow = { [column: string]: unknown };

export class BankingError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BankingError";
    this.code = code;
  }
}

export type BankingAccount = {
  id: string;
  availableBalance: number;
  currentBalance: number;
  officialName: string;
  mask: string;
  institutionId: string;
  name: string;
  type: string;
  subtype: string;
  shareableId: string;
};

export type BankingActivity = {
  id: string;
  name: string;
  amount: number;
  direction: "debit" | "credit";
  date: string;
  paymentChannel: string;
  category: string;
  transferId: string | null;
};

export type ActivityPage = { transactions: BankingActivity[]; page: number; totalPages: number };

function assertText(value: string, label: string, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new BankingError("INVALID_INPUT", `${label} is required and must be at most ${max} characters.`);
  }
  return value.trim();
}

function assertAmount(value: number, allowZero = false): void {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > MAX_CENTS) {
    throw new BankingError("INVALID_AMOUNT", "Amount must be a positive, supported whole number of cents.");
  }
}

function cents(row: DbRow, key: string): number {
  const value = Number(row[key]);
  if (!Number.isSafeInteger(value)) throw new BankingError("DATA_INTEGRITY", `Invalid ${key} stored in banking database.`);
  return value;
}

function timestamp(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new BankingError("DATA_INTEGRITY", "Invalid timestamp stored in banking database.");
  return date.toISOString();
}

function accountShape(row: DbRow): BankingAccount {
  const balance = cents(row, "balance_cents") / 100;
  return {
    id: String(row.id), availableBalance: balance, currentBalance: balance,
    officialName: String(row.official_name), mask: String(row.mask), institutionId: "td-simulated",
    name: String(row.name), type: String(row.type), subtype: String(row.subtype), shareableId: String(row.share_code),
  };
}

async function lockIdempotency(client: PoolClient, scope: string, key: string): Promise<void> {
  // A transaction-level advisory lock serializes concurrent retries for this owner/key pair.
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [JSON.stringify([scope, key])]);
}

async function inTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* preserve the original error */ }
    throw error;
  } finally {
    client.release();
  }
}

/** Applies the app-owned schema after Better Auth has created its `user` table. */
export async function initializeBankingSchema(pool: Pool): Promise<void> {
  await inTransaction(pool, async (client) => {
    await lockIdempotency(client, SCHEMA_LOCK_KEY, "v1");
    await client.query(`
      CREATE TABLE IF NOT EXISTS banking_schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const applied = await client.query<DbRow>("SELECT version FROM banking_schema_migrations WHERE version = $1", [SCHEMA_VERSION]);
    if (applied.rowCount) return;

    await client.query(`
      CREATE TABLE IF NOT EXISTS banking_accounts (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL REFERENCES "user"(id),
        name TEXT NOT NULL,
        official_name TEXT NOT NULL,
        type TEXT NOT NULL,
        subtype TEXT NOT NULL,
        mask TEXT NOT NULL,
        share_code TEXT NOT NULL UNIQUE,
        balance_cents BIGINT NOT NULL DEFAULT 0 CHECK(balance_cents BETWEEN 0 AND ${MAX_CENTS}),
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS banking_accounts_owner_idx ON banking_accounts(owner_user_id, created_at, id);

      CREATE TABLE IF NOT EXISTS banking_transfers (
        id TEXT PRIMARY KEY,
        source_account_id TEXT NOT NULL REFERENCES banking_accounts(id),
        destination_account_id TEXT NOT NULL REFERENCES banking_accounts(id),
        amount_cents BIGINT NOT NULL CHECK(amount_cents > 0 AND amount_cents <= ${MAX_CENTS}),
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS banking_ledger_entries (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES banking_accounts(id),
        signed_cents BIGINT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        payment_channel TEXT NOT NULL,
        transfer_id TEXT REFERENCES banking_transfers(id),
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS banking_ledger_account_idx ON banking_ledger_entries(account_id, created_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS banking_ledger_transfer_idx ON banking_ledger_entries(transfer_id);

      CREATE TABLE IF NOT EXISTS banking_account_requests (
        owner_user_id TEXT NOT NULL REFERENCES "user"(id),
        idempotency_key TEXT NOT NULL,
        request_fingerprint TEXT NOT NULL,
        account_id TEXT NOT NULL REFERENCES banking_accounts(id),
        PRIMARY KEY(owner_user_id, idempotency_key)
      );

      CREATE TABLE IF NOT EXISTS banking_transfer_requests (
        owner_user_id TEXT NOT NULL REFERENCES "user"(id),
        idempotency_key TEXT NOT NULL,
        request_fingerprint TEXT NOT NULL,
        transfer_id TEXT NOT NULL REFERENCES banking_transfers(id),
        PRIMARY KEY(owner_user_id, idempotency_key)
      );

      CREATE OR REPLACE FUNCTION banking_reject_ledger_mutation() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'ledger entries are immutable';
      END;
      $$;
      DROP TRIGGER IF EXISTS banking_ledger_no_update ON banking_ledger_entries;
      CREATE TRIGGER banking_ledger_no_update BEFORE UPDATE ON banking_ledger_entries
        FOR EACH ROW EXECUTE FUNCTION banking_reject_ledger_mutation();
      DROP TRIGGER IF EXISTS banking_ledger_no_delete ON banking_ledger_entries;
      CREATE TRIGGER banking_ledger_no_delete BEFORE DELETE ON banking_ledger_entries
        FOR EACH ROW EXECUTE FUNCTION banking_reject_ledger_mutation();
    `);
    await client.query("INSERT INTO banking_schema_migrations(version) VALUES ($1)", [SCHEMA_VERSION]);
  });
}

export type CreateBankingAccountInput = {
  ownerUserId: string;
  accountIdempotencyKey: string;
  name?: string;
  type?: string;
  subtype?: string;
  openingBalanceCents?: number;
};

/** Creates an account with fictional net-zero activity. Retries replay by scoped key. */
export async function createBankingAccount(pool: Pool, input: CreateBankingAccountInput): Promise<BankingAccount> {
  const owner = assertText(input.ownerUserId, "Owner user ID");
  const key = assertText(input.accountIdempotencyKey, "Account idempotency key");
  const name = assertText(input.name ?? "TD Everyday Checking", "Account name", 80);
  const type = assertText(input.type ?? "depository", "Account type", 40);
  const subtype = assertText(input.subtype ?? "checking", "Account subtype", 40);
  const opening = input.openingBalanceCents ?? 125_000;
  assertAmount(opening, true);
  const fingerprint = JSON.stringify([name, type, subtype, opening]);

  return inTransaction(pool, async (client) => {
    await lockIdempotency(client, owner, `account:${key}`);
    const prior = await client.query<DbRow>(`SELECT r.request_fingerprint, a.*
      FROM banking_account_requests r JOIN banking_accounts a ON a.id = r.account_id
      WHERE r.owner_user_id = $1 AND r.idempotency_key = $2`, [owner, key]);
    if (prior.rows[0]) {
      if (prior.rows[0].request_fingerprint !== fingerprint) throw new BankingError("IDEMPOTENCY_CONFLICT", "Account creation key was already used with different details.");
      return accountShape(prior.rows[0]);
    }

    const id = randomUUID();
    const shareCode = randomBytes(18).toString("base64url");
    const now = new Date().toISOString();
    const account = await client.query<DbRow>(`INSERT INTO banking_accounts
      (id, owner_user_id, name, official_name, type, subtype, mask, share_code, balance_cents, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [id, owner, name, name, type, subtype, String(randomInt(0, 10_000)).padStart(4, "0"), shareCode, opening, now]);
    const entry = `INSERT INTO banking_ledger_entries
      (id, account_id, signed_cents, description, category, payment_channel, transfer_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)`;
    await client.query(entry, [randomUUID(), id, opening, "Opening balance", "Deposit", "other", now]);
    const sample = Math.min(2_450, opening || 2_450);
    await client.query(entry, [randomUUID(), id, sample, "Sample cash deposit", "Deposit", "in store", new Date(Date.now() - 172_800_000).toISOString()]);
    await client.query(entry, [randomUUID(), id, -sample, "Sample grocery purchase", "Shopping", "in store", new Date(Date.now() - 86_400_000).toISOString()]);
    await client.query(`INSERT INTO banking_account_requests(owner_user_id, idempotency_key, request_fingerprint, account_id)
      VALUES ($1, $2, $3, $4)`, [owner, key, fingerprint, id]);
    if (!account.rows[0]) throw new BankingError("DATA_INTEGRITY", "Created account could not be read back.");
    return accountShape(account.rows[0]);
  });
}

export async function listBankingAccounts(pool: Pool, ownerUserId: string): Promise<BankingAccount[]> {
  const owner = assertText(ownerUserId, "Owner user ID");
  const result = await pool.query<DbRow>("SELECT * FROM banking_accounts WHERE owner_user_id = $1 ORDER BY created_at, id", [owner]);
  return result.rows.map(accountShape);
}

export async function listAccountActivity(
  pool: Pool,
  input: { ownerUserId: string; accountId: string; page?: number; limit?: number },
): Promise<ActivityPage> {
  const owner = assertText(input.ownerUserId, "Owner user ID");
  const accountId = assertText(input.accountId, "Account ID");
  const limit = input.limit ?? DEFAULT_PAGE_SIZE;
  const page = input.page ?? 1;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) throw new BankingError("INVALID_PAGE_SIZE", `Page size must be between 1 and ${MAX_PAGE_SIZE}.`);
  if (!Number.isSafeInteger(page) || page < 1) throw new BankingError("INVALID_PAGE", "Page must be a positive safe integer.");
  const result = await pool.query<DbRow>(`
    WITH owned AS (
      SELECT id FROM banking_accounts WHERE id = $1 AND owner_user_id = $2
    ), activity_count AS (
      SELECT owned.id AS account_id, (
        SELECT COUNT(*) FROM banking_ledger_entries WHERE account_id = owned.id
      ) AS total FROM owned
    )
    SELECT activity_count.total, entry.*
    FROM activity_count
    LEFT JOIN LATERAL (
      SELECT * FROM banking_ledger_entries
      WHERE account_id = activity_count.account_id
      ORDER BY created_at DESC, id DESC
      LIMIT $3::integer
      OFFSET LEAST(($4::bigint - 1)::numeric * $3::integer,
        (GREATEST(activity_count.total, 1) - 1) / $3::integer * $3::integer)::bigint
    ) entry ON true
    ORDER BY entry.created_at DESC, entry.id DESC`, [accountId, owner, limit, page]);
  if (!result.rows.length) throw new BankingError("ACCOUNT_NOT_FOUND", "Account was not found.");
  const totalRows = Number(result.rows[0].total);
  if (!Number.isSafeInteger(totalRows)) throw new BankingError("DATA_INTEGRITY", "Activity count exceeds supported range.");
  const totalPages = Math.ceil(totalRows / limit);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const transactions = result.rows.filter((row) => row.id != null).map((row): BankingActivity => {
    const value = cents(row, "signed_cents");
    return {
      id: String(row.id), name: String(row.description), amount: Math.abs(value) / 100,
      direction: value < 0 ? "debit" : "credit", date: timestamp(row.created_at),
      paymentChannel: String(row.payment_channel), category: String(row.category),
      transferId: row.transfer_id == null ? null : String(row.transfer_id),
    };
  });
  return { transactions, page: currentPage, totalPages };
}

export type TransferFundsInput = {
  ownerUserId: string;
  sourceAccountId: string;
  recipientCode: string;
  recipientEmail: string;
  amountCents: number;
  idempotencyKey: string;
  note?: string;
};

/** Executes one atomic, balanced transfer. Recipient email is checked against Better Auth's user table. */
export async function transferFunds(pool: Pool, input: TransferFundsInput): Promise<{ transferId: string; replayed: boolean }> {
  const owner = assertText(input.ownerUserId, "Owner user ID");
  const sourceId = assertText(input.sourceAccountId, "Source account ID");
  const code = assertText(input.recipientCode, "Recipient code", 100);
  const email = assertText(input.recipientEmail, "Recipient email", 320).toLowerCase();
  const key = assertText(input.idempotencyKey, "Transfer idempotency key");
  const note = input.note === undefined ? "" : assertText(input.note, "Transfer note", 120);
  assertAmount(input.amountCents);
  const fingerprint = JSON.stringify([sourceId, code, email, input.amountCents, note]);

  return inTransaction(pool, async (client) => {
    await lockIdempotency(client, owner, `transfer:${key}`);
    const prior = await client.query<DbRow>(`SELECT request_fingerprint, transfer_id FROM banking_transfer_requests
      WHERE owner_user_id = $1 AND idempotency_key = $2`, [owner, key]);
    if (prior.rows[0]) {
      if (prior.rows[0].request_fingerprint !== fingerprint) throw new BankingError("IDEMPOTENCY_CONFLICT", "Transfer key was already used with different details.");
      return { transferId: String(prior.rows[0].transfer_id), replayed: true };
    }

    const sourceOwnership = await client.query("SELECT id FROM banking_accounts WHERE id = $1 AND owner_user_id = $2", [sourceId, owner]);
    if (!sourceOwnership.rowCount) throw new BankingError("ACCOUNT_NOT_FOUND", "Source account was not found.");
    const destinationLookup = await client.query<DbRow>("SELECT id FROM banking_accounts WHERE share_code = $1", [code]);
    if (!destinationLookup.rows[0]) throw new BankingError("RECIPIENT_NOT_FOUND", "Recipient code was not found.");
    const destinationId = String(destinationLookup.rows[0].id);
    if (destinationId === sourceId) throw new BankingError("SELF_TRANSFER", "Transfers to the same account are not allowed.");

    // Lock both rows one at a time in deterministic ID order, preventing cross-transfer deadlocks.
    const locked = new Map<string, DbRow>();
    for (const id of [sourceId, destinationId].sort()) {
      const result = await client.query<DbRow>("SELECT * FROM banking_accounts WHERE id = $1 FOR UPDATE", [id]);
      if (result.rows[0]) locked.set(id, result.rows[0]);
    }
    const source = locked.get(sourceId);
    if (!source || String(source.owner_user_id) !== owner) throw new BankingError("ACCOUNT_NOT_FOUND", "Source account was not found.");
    const destination = locked.get(destinationId);
    if (!destination || String(destination.share_code) !== code) throw new BankingError("RECIPIENT_NOT_FOUND", "Recipient code was not found.");

    const recipient = await client.query<DbRow>("SELECT email FROM \"user\" WHERE id = $1", [String(destination.owner_user_id)]);
    if (!recipient.rows[0] || String(recipient.rows[0].email).trim().toLowerCase() !== email) {
      throw new BankingError("RECIPIENT_EMAIL_MISMATCH", "Recipient code and email do not match.");
    }
    const sourceBalance = cents(source, "balance_cents");
    const destinationBalance = cents(destination, "balance_cents");
    if (sourceBalance < input.amountCents) throw new BankingError("INSUFFICIENT_FUNDS", "Account has insufficient funds.");
    if (destinationBalance > MAX_CENTS - input.amountCents) throw new BankingError("BALANCE_LIMIT", "Recipient account balance would exceed the supported limit.");

    const transferId = randomUUID();
    const now = new Date().toISOString();
    await client.query("UPDATE banking_accounts SET balance_cents = balance_cents - $1 WHERE id = $2", [input.amountCents, sourceId]);
    await client.query("UPDATE banking_accounts SET balance_cents = balance_cents + $1 WHERE id = $2", [input.amountCents, destinationId]);
    await client.query(`INSERT INTO banking_transfers(id, source_account_id, destination_account_id, amount_cents, created_at)
      VALUES ($1, $2, $3, $4, $5)`, [transferId, sourceId, destinationId, input.amountCents, now]);
    const ledgerQuery = `INSERT INTO banking_ledger_entries
      (id, account_id, signed_cents, description, category, payment_channel, transfer_id, created_at)
      VALUES ($1, $2, $3, $4, 'Transfer', 'online', $5, $6)`;
    await client.query(ledgerQuery, [randomUUID(), sourceId, -input.amountCents, note || "Transfer sent", transferId, now]);
    await client.query(ledgerQuery, [randomUUID(), destinationId, input.amountCents, note || "Transfer received", transferId, now]);
    await client.query(`INSERT INTO banking_transfer_requests(owner_user_id, idempotency_key, request_fingerprint, transfer_id)
      VALUES ($1, $2, $3, $4)`, [owner, key, fingerprint, transferId]);
    return { transferId, replayed: false };
  });
}
