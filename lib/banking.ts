import { randomBytes, randomInt, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export type BankingDatabase = DatabaseSync;

const SCHEMA_VERSION = 1;
const MAX_CENTS = 99_999_999_999;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

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

function assertAmount(cents: number, allowZero = false): void {
  if (!Number.isSafeInteger(cents) || cents < (allowZero ? 0 : 1) || cents > MAX_CENTS) {
    throw new BankingError("INVALID_AMOUNT", "Amount must be a positive, supported whole number of cents.");
  }
}

function cents(row: Record<string, unknown>, key: string): number {
  const value = Number(row[key]);
  if (!Number.isSafeInteger(value)) throw new BankingError("DATA_INTEGRITY", `Invalid ${key} stored in banking database.`);
  return value;
}

function accountShape(row: Record<string, unknown>): BankingAccount {
  const balance = cents(row, "balance_cents") / 100;
  return {
    id: String(row.id), availableBalance: balance, currentBalance: balance,
    officialName: String(row.official_name), mask: String(row.mask), institutionId: "td-simulated",
    name: String(row.name), type: String(row.type), subtype: String(row.subtype), shareableId: String(row.share_code),
  };
}

/** Creates an app-owned schema without changing SQLite's shared PRAGMA user_version. */
export function initializeBankingSchema(db: BankingDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS banking_schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  db.exec("BEGIN IMMEDIATE");
  try {
    // Check again under the write lock so concurrent startup callers are safe.
    const applied = db.prepare("SELECT version FROM banking_schema_migrations WHERE version = ?").get(SCHEMA_VERSION);
    if (applied) {
      db.exec("COMMIT");
      return;
    }
    db.exec(`
    CREATE TABLE IF NOT EXISTS banking_accounts (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      official_name TEXT NOT NULL,
      type TEXT NOT NULL,
      subtype TEXT NOT NULL,
      mask TEXT NOT NULL,
      share_code TEXT NOT NULL UNIQUE,
      balance_cents INTEGER NOT NULL DEFAULT 0 CHECK(balance_cents >= 0),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS banking_accounts_owner_idx ON banking_accounts(owner_user_id, created_at, id);
    CREATE TABLE IF NOT EXISTS banking_ledger_entries (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES banking_accounts(id),
      signed_cents INTEGER NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      payment_channel TEXT NOT NULL,
      transfer_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS banking_ledger_account_idx ON banking_ledger_entries(account_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS banking_ledger_transfer_idx ON banking_ledger_entries(transfer_id);
    CREATE TABLE IF NOT EXISTS banking_account_requests (
      owner_user_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      request_fingerprint TEXT NOT NULL,
      account_id TEXT NOT NULL REFERENCES banking_accounts(id),
      PRIMARY KEY(owner_user_id, idempotency_key)
    );
    CREATE TABLE IF NOT EXISTS banking_transfers (
      id TEXT PRIMARY KEY,
      source_account_id TEXT NOT NULL REFERENCES banking_accounts(id),
      destination_account_id TEXT NOT NULL REFERENCES banking_accounts(id),
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS banking_transfer_requests (
      owner_user_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      request_fingerprint TEXT NOT NULL,
      transfer_id TEXT NOT NULL REFERENCES banking_transfers(id),
      PRIMARY KEY(owner_user_id, idempotency_key)
    );
    CREATE TRIGGER IF NOT EXISTS banking_ledger_no_update
      BEFORE UPDATE ON banking_ledger_entries BEGIN SELECT RAISE(ABORT, 'ledger entries are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS banking_ledger_no_delete
      BEFORE DELETE ON banking_ledger_entries BEGIN SELECT RAISE(ABORT, 'ledger entries are immutable'); END;
    INSERT INTO banking_schema_migrations(version, applied_at) VALUES (${SCHEMA_VERSION}, '${new Date().toISOString()}');
  `);
    db.exec("COMMIT");
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* transaction may already be closed */ }
    throw error;
  }
}

export type CreateBankingAccountInput = {
  ownerUserId: string;
  accountIdempotencyKey: string;
  name?: string;
  type?: string;
  subtype?: string;
  openingBalanceCents?: number;
};

/** Creates an account with a net-zero set of fictional activity rows. Retries replay by scoped key. */
export function createBankingAccount(db: BankingDatabase, input: CreateBankingAccountInput): BankingAccount {
  const owner = assertText(input.ownerUserId, "Owner user ID");
  const key = assertText(input.accountIdempotencyKey, "Account idempotency key");
  const name = assertText(input.name ?? "TD Everyday Checking", "Account name", 80);
  const type = assertText(input.type ?? "depository", "Account type", 40);
  const subtype = assertText(input.subtype ?? "checking", "Account subtype", 40);
  const opening = input.openingBalanceCents ?? 125_000;
  assertAmount(opening, true);
  const fingerprint = JSON.stringify([name, type, subtype, opening]);

  db.exec("BEGIN IMMEDIATE");
  try {
    const prior = db.prepare(`SELECT r.request_fingerprint, a.* FROM banking_account_requests r
      JOIN banking_accounts a ON a.id = r.account_id WHERE r.owner_user_id = ? AND r.idempotency_key = ?`).get(owner, key);
    if (prior) {
      if (prior.request_fingerprint !== fingerprint) throw new BankingError("IDEMPOTENCY_CONFLICT", "Account creation key was already used with different details.");
      db.exec("COMMIT");
      return accountShape(prior);
    }

    const id = randomUUID();
    const shareCode = randomBytes(18).toString("base64url");
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO banking_accounts(id, owner_user_id, name, official_name, type, subtype, mask, share_code, balance_cents, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, owner, name, name, type, subtype, String(randomInt(0, 10_000)).padStart(4, "0"), shareCode, opening, now);
    const entry = db.prepare(`INSERT INTO banking_ledger_entries(id, account_id, signed_cents, description, category, payment_channel, transfer_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`);
    entry.run(randomUUID(), id, opening, "Opening balance", "Deposit", "other", now);
    // A small, balanced fictional pair gives the demo account believable history without changing its balance.
    const sample = Math.min(2_450, opening || 2_450);
    entry.run(randomUUID(), id, sample, "Sample cash deposit", "Deposit", "in store", new Date(Date.now() - 172_800_000).toISOString());
    entry.run(randomUUID(), id, -sample, "Sample grocery purchase", "Shopping", "in store", new Date(Date.now() - 86_400_000).toISOString());
    db.prepare(`INSERT INTO banking_account_requests(owner_user_id, idempotency_key, request_fingerprint, account_id) VALUES (?, ?, ?, ?)`)
      .run(owner, key, fingerprint, id);
    const row = db.prepare("SELECT * FROM banking_accounts WHERE id = ?").get(id);
    db.exec("COMMIT");
    if (!row) throw new BankingError("DATA_INTEGRITY", "Created account could not be read back.");
    return accountShape(row);
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* transaction may already be closed */ }
    throw error;
  }
}

export function listBankingAccounts(db: BankingDatabase, ownerUserId: string): BankingAccount[] {
  const owner = assertText(ownerUserId, "Owner user ID");
  return db.prepare("SELECT * FROM banking_accounts WHERE owner_user_id = ? ORDER BY created_at, id").all(owner).map(accountShape);
}

export function listAccountActivity(
  db: BankingDatabase,
  input: { ownerUserId: string; accountId: string; page?: number; limit?: number },
): ActivityPage {
  const owner = assertText(input.ownerUserId, "Owner user ID");
  const accountId = assertText(input.accountId, "Account ID");
  const limit = input.limit ?? DEFAULT_PAGE_SIZE;
  const page = input.page ?? 1;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) throw new BankingError("INVALID_PAGE_SIZE", `Page size must be between 1 and ${MAX_PAGE_SIZE}.`);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) throw new BankingError("INVALID_PAGE", "Page must be a positive integer no greater than 1,000,000.");
  const owns = db.prepare("SELECT id FROM banking_accounts WHERE id = ? AND owner_user_id = ?").get(accountId, owner);
  if (!owns) throw new BankingError("ACCOUNT_NOT_FOUND", "Account was not found.");
  const totalRows = Number(db.prepare("SELECT COUNT(*) AS total FROM banking_ledger_entries WHERE account_id = ?").get(accountId)?.total ?? 0);
  const totalPages = Math.ceil(totalRows / limit);
  const pageRows = db.prepare("SELECT * FROM banking_ledger_entries WHERE account_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?")
    .all(accountId, limit, (page - 1) * limit);
  const transactions = pageRows.map((row): BankingActivity => {
    const value = cents(row, "signed_cents");
    return {
      id: String(row.id), name: String(row.description), amount: Math.abs(value) / 100,
      direction: value < 0 ? "debit" : "credit", date: String(row.created_at),
      paymentChannel: String(row.payment_channel), category: String(row.category),
      transferId: row.transfer_id == null ? null : String(row.transfer_id),
    };
  });
  return { transactions, page, totalPages };
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

/** Executes one atomic, balanced transfer. Recipient email is checked against the Better Auth user table. */
export function transferFunds(db: BankingDatabase, input: TransferFundsInput): { transferId: string; replayed: boolean } {
  const owner = assertText(input.ownerUserId, "Owner user ID");
  const sourceId = assertText(input.sourceAccountId, "Source account ID");
  const code = assertText(input.recipientCode, "Recipient code", 100);
  const email = assertText(input.recipientEmail, "Recipient email", 320).toLowerCase();
  const key = assertText(input.idempotencyKey, "Transfer idempotency key");
  const note = input.note === undefined ? "" : assertText(input.note, "Transfer note", 120);
  assertAmount(input.amountCents);
  const fingerprint = JSON.stringify([sourceId, code, email, input.amountCents, note]);

  db.exec("BEGIN IMMEDIATE");
  try {
    const prior = db.prepare(`SELECT request_fingerprint, transfer_id FROM banking_transfer_requests WHERE owner_user_id = ? AND idempotency_key = ?`).get(owner, key);
    if (prior) {
      if (prior.request_fingerprint !== fingerprint) throw new BankingError("IDEMPOTENCY_CONFLICT", "Transfer key was already used with different details.");
      db.exec("COMMIT");
      return { transferId: String(prior.transfer_id), replayed: true };
    }
    const source = db.prepare("SELECT * FROM banking_accounts WHERE id = ? AND owner_user_id = ?").get(sourceId, owner);
    if (!source) throw new BankingError("ACCOUNT_NOT_FOUND", "Source account was not found.");
    const destination = db.prepare("SELECT * FROM banking_accounts WHERE share_code = ?").get(code);
    if (!destination) throw new BankingError("RECIPIENT_NOT_FOUND", "Recipient code was not found.");
    if (String(destination.id) === sourceId) throw new BankingError("SELF_TRANSFER", "Transfers to the same account are not allowed.");
    const recipient = db.prepare("SELECT email FROM user WHERE id = ?").get(String(destination.owner_user_id));
    if (!recipient || String(recipient.email).trim().toLowerCase() !== email) {
      throw new BankingError("RECIPIENT_EMAIL_MISMATCH", "Recipient code and email do not match.");
    }
    const balance = cents(source, "balance_cents");
    if (balance < input.amountCents) throw new BankingError("INSUFFICIENT_FUNDS", "Account has insufficient funds.");
    const transferId = randomUUID();
    const now = new Date().toISOString();
    db.prepare("UPDATE banking_accounts SET balance_cents = balance_cents - ? WHERE id = ?").run(input.amountCents, sourceId);
    db.prepare("UPDATE banking_accounts SET balance_cents = balance_cents + ? WHERE id = ?").run(input.amountCents, String(destination.id));
    db.prepare("INSERT INTO banking_transfers(id, source_account_id, destination_account_id, amount_cents, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(transferId, sourceId, String(destination.id), input.amountCents, now);
    const ledger = db.prepare(`INSERT INTO banking_ledger_entries(id, account_id, signed_cents, description, category, payment_channel, transfer_id, created_at)
      VALUES (?, ?, ?, ?, 'Transfer', 'online', ?, ?)`);
    ledger.run(randomUUID(), sourceId, -input.amountCents, note || "Transfer sent", transferId, now);
    ledger.run(randomUUID(), String(destination.id), input.amountCents, note || "Transfer received", transferId, now);
    db.prepare(`INSERT INTO banking_transfer_requests(owner_user_id, idempotency_key, request_fingerprint, transfer_id) VALUES (?, ?, ?, ?)`)
      .run(owner, key, fingerprint, transferId);
    db.exec("COMMIT");
    return { transferId, replayed: false };
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* transaction may already be closed */ }
    throw error;
  }
}
