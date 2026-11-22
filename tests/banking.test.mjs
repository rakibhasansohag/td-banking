import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import pg from "pg";

import {
  BankingError,
  createBankingAccount,
  initializeBankingSchema,
  listAccountActivity,
  listBankingAccounts,
  transferFunds,
} from "../lib/banking.ts";

const { Pool } = pg;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const loopbackHosts = new Set(["", "localhost", "127.0.0.1", "::1", "[::1]"]);

test("PostgreSQL banking ledger preserves transfer and pagination invariants", {
  skip: testDatabaseUrl ? false : "Set TEST_DATABASE_URL to run against a disposable local PostgreSQL database.",
}, async (t) => {
  const parsedUrl = new URL(testDatabaseUrl);
  assert.ok(loopbackHosts.has(parsedUrl.hostname), "TEST_DATABASE_URL must point to a local disposable PostgreSQL server.");

  const schema = `banking_test_${randomUUID().replaceAll("-", "")}`;
  const adminPool = new Pool({ connectionString: testDatabaseUrl });
  let testPool;
  let schemaCreated = false;
  t.after(async () => {
    if (testPool) await testPool.end();
    if (schemaCreated) await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await adminPool.end();
  });
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  testPool = new Pool({
    connectionString: testDatabaseUrl,
    options: `-c search_path=${schema},public`,
  });
  const pool = testPool;

  // The private migration normally follows Better Auth's schema migration. A minimal user table
  // in this isolated test schema supplies only the standard Better Auth fields the core requires.
  await pool.query('CREATE TABLE "user" (id TEXT PRIMARY KEY, email TEXT NOT NULL)');
  await pool.query('INSERT INTO "user" (id, email) VALUES ($1, $2), ($3, $4)', [
    "sender-user", "sender@example.test", "recipient-user", "recipient@example.test",
  ]);
  await initializeBankingSchema(pool);
  await initializeBankingSchema(pool);

  const sender = await createBankingAccount(pool, {
    ownerUserId: "sender-user", accountIdempotencyKey: "create-sender", openingBalanceCents: 50_000,
  });
  const recipient = await createBankingAccount(pool, {
    ownerUserId: "recipient-user", accountIdempotencyKey: "create-recipient", openingBalanceCents: 1_000,
  });
  assert.equal((await createBankingAccount(pool, {
    ownerUserId: "sender-user", accountIdempotencyKey: "create-sender", openingBalanceCents: 50_000,
  })).id, sender.id, "account create retries return the original account");
  assert.equal((await listBankingAccounts(pool, "sender-user")).length, 1);

  const transferInput = {
    ownerUserId: "sender-user", sourceAccountId: sender.id, recipientCode: recipient.shareableId,
    recipientEmail: "RECIPIENT@example.test", amountCents: 12_345, idempotencyKey: "send-1", note: "Rent split",
  };
  const first = await transferFunds(pool, transferInput);
  assert.equal(first.replayed, false);
  assert.equal((await transferFunds(pool, transferInput)).transferId, first.transferId, "same transfer retry replays");
  assert.equal((await transferFunds(pool, transferInput)).replayed, true);
  await assert.rejects(transferFunds(pool, { ...transferInput, amountCents: 12_346 }), (error) => error instanceof BankingError && error.code === "IDEMPOTENCY_CONFLICT");
  await assert.rejects(transferFunds(pool, { ...transferInput, note: "Different note" }), (error) => error instanceof BankingError && error.code === "IDEMPOTENCY_CONFLICT");
  await assert.rejects(transferFunds(pool, { ...transferInput, idempotencyKey: "wrong-email", recipientEmail: "wrong@example.test" }), (error) => error instanceof BankingError && error.code === "RECIPIENT_EMAIL_MISMATCH");
  await assert.rejects(transferFunds(pool, { ...transferInput, idempotencyKey: "too-large", amountCents: 99_000_000 }), (error) => error instanceof BankingError && error.code === "INSUFFICIENT_FUNDS");
  await assert.rejects(transferFunds(pool, { ...transferInput, idempotencyKey: "zero", amountCents: 0 }), (error) => error instanceof BankingError && error.code === "INVALID_AMOUNT");
  await assert.rejects(transferFunds(pool, { ...transferInput, ownerUserId: "recipient-user", idempotencyKey: "wrong-owner" }), (error) => error instanceof BankingError && error.code === "ACCOUNT_NOT_FOUND");
  await assert.rejects(transferFunds(pool, { ...transferInput, ownerUserId: "recipient-user", sourceAccountId: recipient.id, recipientCode: recipient.shareableId, idempotencyKey: "self" }), (error) => error instanceof BankingError && error.code === "SELF_TRANSFER");

  const accounts = new Map((await listBankingAccounts(pool, "sender-user")).map((account) => [account.id, account]));
  assert.equal(accounts.get(sender.id).currentBalance, 376.55);
  assert.equal((await listBankingAccounts(pool, "recipient-user"))[0].currentBalance, 133.45);
  const ledger = await pool.query("SELECT signed_cents FROM banking_ledger_entries WHERE transfer_id = $1", [first.transferId]);
  assert.equal(ledger.rows.length, 2);
  assert.equal(ledger.rows.reduce((sum, row) => sum + Number(row.signed_cents), 0), 0, "transfer pair is balanced");
  const sentEntry = await pool.query("SELECT description FROM banking_ledger_entries WHERE transfer_id = $1 AND signed_cents < 0", [first.transferId]);
  assert.equal(sentEntry.rows[0].description, "Rent split");
  await assert.rejects(pool.query("UPDATE banking_ledger_entries SET signed_cents = 0 WHERE transfer_id = $1", [first.transferId]), /ledger entries are immutable/);
  await assert.rejects(listAccountActivity(pool, { ownerUserId: "recipient-user", accountId: sender.id }), (error) => error instanceof BankingError && error.code === "ACCOUNT_NOT_FOUND");
  const firstPage = await listAccountActivity(pool, { ownerUserId: "sender-user", accountId: sender.id, page: 1, limit: 2 });
  const secondPage = await listAccountActivity(pool, { ownerUserId: "sender-user", accountId: sender.id, page: 2, limit: 2 });
  const oversizedPage = await listAccountActivity(pool, { ownerUserId: "sender-user", accountId: sender.id, page: 1_000_001, limit: 2 });
  assert.equal(firstPage.totalPages, 2);
  assert.equal(firstPage.transactions.length, 2);
  assert.equal(secondPage.transactions.length, 2);
  assert.equal(oversizedPage.page, secondPage.page, "oversized valid pages clamp to the last available page");
  assert.deepEqual(oversizedPage.transactions.map((item) => item.id), secondPage.transactions.map((item) => item.id));
  assert.notEqual(firstPage.transactions[0].id, secondPage.transactions[0].id);
  await assert.rejects(listAccountActivity(pool, { ownerUserId: "sender-user", accountId: sender.id, page: 1.5 }), (error) => error instanceof BankingError && error.code === "INVALID_PAGE");
  await assert.rejects(listAccountActivity(pool, { ownerUserId: "sender-user", accountId: sender.id, page: -1 }), (error) => error instanceof BankingError && error.code === "INVALID_PAGE");

  const concurrentInput = { ...transferInput, amountCents: 1_000, idempotencyKey: "concurrent-send", note: "Concurrent retry" };
  const concurrent = await Promise.all([
    transferFunds(pool, concurrentInput),
    transferFunds(pool, concurrentInput),
  ]);
  assert.equal(concurrent[0].transferId, concurrent[1].transferId, "concurrent retries share one transfer");
  assert.equal(concurrent.filter((result) => result.replayed).length, 1, "one concurrent call replays the committed transfer");
  assert.equal((await listBankingAccounts(pool, "sender-user")).find((account) => account.id === sender.id)?.currentBalance, 366.55);
  assert.equal((await listBankingAccounts(pool, "recipient-user"))[0].currentBalance, 143.45);
});
