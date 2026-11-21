import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  BankingError,
  createBankingAccount,
  initializeBankingSchema,
  listAccountActivity,
  listBankingAccounts,
  transferFunds,
} from "../lib/banking.ts";

const db = new DatabaseSync(":memory:");
db.exec("CREATE TABLE user (id TEXT PRIMARY KEY, email TEXT NOT NULL)");
db.prepare("INSERT INTO user(id, email) VALUES (?, ?)").run("sender-user", "sender@example.test");
db.prepare("INSERT INTO user(id, email) VALUES (?, ?)").run("recipient-user", "recipient@example.test");
initializeBankingSchema(db);

const sender = createBankingAccount(db, {
  ownerUserId: "sender-user", accountIdempotencyKey: "create-sender", openingBalanceCents: 50_000,
});
const recipient = createBankingAccount(db, {
  ownerUserId: "recipient-user", accountIdempotencyKey: "create-recipient", openingBalanceCents: 1_000,
});
assert.equal(createBankingAccount(db, {
  ownerUserId: "sender-user", accountIdempotencyKey: "create-sender", openingBalanceCents: 50_000,
}).id, sender.id, "account create retries return the original account");
assert.equal(listBankingAccounts(db, "sender-user").length, 1);

const transferInput = {
  ownerUserId: "sender-user", sourceAccountId: sender.id, recipientCode: recipient.shareableId,
  recipientEmail: "RECIPIENT@example.test", amountCents: 12_345, idempotencyKey: "send-1", note: "Rent split",
};
const first = transferFunds(db, transferInput);
assert.equal(first.replayed, false);
assert.equal(transferFunds(db, transferInput).transferId, first.transferId, "same transfer retry replays");
assert.equal(transferFunds(db, transferInput).replayed, true);
assert.throws(() => transferFunds(db, { ...transferInput, amountCents: 12_346 }), (error) => error instanceof BankingError && error.code === "IDEMPOTENCY_CONFLICT");
assert.throws(() => transferFunds(db, { ...transferInput, note: "Different note" }), (error) => error instanceof BankingError && error.code === "IDEMPOTENCY_CONFLICT");
assert.throws(() => transferFunds(db, { ...transferInput, idempotencyKey: "wrong-email", recipientEmail: "wrong@example.test" }), (error) => error instanceof BankingError && error.code === "RECIPIENT_EMAIL_MISMATCH");
assert.throws(() => transferFunds(db, { ...transferInput, idempotencyKey: "too-large", amountCents: 99_000_000 }), (error) => error instanceof BankingError && error.code === "INSUFFICIENT_FUNDS");
assert.throws(() => transferFunds(db, { ...transferInput, idempotencyKey: "zero", amountCents: 0 }), (error) => error instanceof BankingError && error.code === "INVALID_AMOUNT");

const accounts = new Map(listBankingAccounts(db, "sender-user").map((account) => [account.id, account]));
assert.equal(accounts.get(sender.id).currentBalance, 376.55);
assert.equal(listBankingAccounts(db, "recipient-user")[0].currentBalance, 133.45);
const ledger = db.prepare("SELECT signed_cents FROM banking_ledger_entries WHERE transfer_id = ?").all(first.transferId);
assert.equal(ledger.length, 2);
assert.equal(ledger.reduce((sum, row) => sum + Number(row.signed_cents), 0), 0, "transfer pair is balanced");
assert.equal(db.prepare("SELECT description FROM banking_ledger_entries WHERE transfer_id = ? AND signed_cents < 0").get(first.transferId).description, "Rent split");
assert.throws(() => db.prepare("UPDATE banking_ledger_entries SET signed_cents = 0 WHERE transfer_id = ?").run(first.transferId), /immutable/);
assert.throws(() => listAccountActivity(db, { ownerUserId: "recipient-user", accountId: sender.id }), (error) => error instanceof BankingError && error.code === "ACCOUNT_NOT_FOUND");
const firstPage = listAccountActivity(db, { ownerUserId: "sender-user", accountId: sender.id, page: 1, limit: 2 });
const secondPage = listAccountActivity(db, { ownerUserId: "sender-user", accountId: sender.id, page: 2, limit: 2 });
const oversizedPage = listAccountActivity(db, { ownerUserId: "sender-user", accountId: sender.id, page: 1_000_001, limit: 2 });
assert.equal(firstPage.totalPages, 2);
assert.equal(firstPage.transactions.length, 2);
assert.equal(secondPage.transactions.length, 2);
assert.equal(oversizedPage.page, secondPage.page, "oversized valid pages clamp to the last available page");
assert.deepEqual(oversizedPage.transactions.map((item) => item.id), secondPage.transactions.map((item) => item.id));
assert.notEqual(firstPage.transactions[0].id, secondPage.transactions[0].id);
assert.throws(() => listAccountActivity(db, { ownerUserId: "sender-user", accountId: sender.id, page: 1.5 }), (error) => error instanceof BankingError && error.code === "INVALID_PAGE");
assert.throws(() => listAccountActivity(db, { ownerUserId: "sender-user", accountId: sender.id, page: -1 }), (error) => error instanceof BankingError && error.code === "INVALID_PAGE");

db.close();
console.log("banking core invariants passed");
