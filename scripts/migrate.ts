import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import type { Pool, PoolClient } from "pg";
import { initializeBankingSchema } from "../lib/banking.ts";
import { createAuthOptions } from "../lib/auth.ts";
import { getMigrationPool } from "../lib/database.ts";

const MIGRATION_LOCK_NAME = "td-banking-schema-migrations";

async function migrateDatabase(): Promise<void> {
  let pool: Pool | undefined;
  let lockClient: PoolClient | undefined;
  let lockAcquired = false;

  try {
    pool = getMigrationPool();
    lockClient = await pool.connect();
    await lockClient.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [MIGRATION_LOCK_NAME]);
    lockAcquired = true;

    // Apply auth tables first; banking schema depends on auth user IDs.
    const auth = betterAuth(createAuthOptions(pool));
    const migrations = await getMigrations(auth.options);
    await migrations.runMigrations();
    await initializeBankingSchema(pool);

    console.log("Better Auth and banking schemas are up to date.");
  } catch (error) {
    console.error(
      "Database migration failed.",
      error instanceof Error ? error.message : "Unknown migration error."
    );
    process.exitCode = 1;
  } finally {
    if (lockClient) {
      if (lockAcquired) {
        try {
          await lockClient.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [MIGRATION_LOCK_NAME]);
        } catch {
          console.error("Could not release the database migration lock; PostgreSQL will release it when the connection closes.");
        }
      }
      lockClient.release();
    }

    if (pool) {
      try {
        await pool.end();
      } catch {
        process.exitCode = 1;
      }
    }
  }
}

await migrateDatabase();
