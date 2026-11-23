import { Pool, type PoolConfig } from "pg";
import { createDatabaseGatewayStreamFactory } from "./database-gateway.ts";

type PoolRegistry = typeof globalThis & {
  __tdBankingRuntimePool?: Pool;
  __tdBankingMigrationPool?: Pool;
};

const poolRegistry = globalThis as PoolRegistry;
const SSL_URL_PARAMETERS = new Set([
  "ssl",
  "sslmode",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "sslpassword",
  "sslcrl",
  "sslminprotocolversion",
  "sslmaxprotocolversion",
]);

function decodeURLPart(value: string, field: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`DATABASE_URL has invalid encoding in its ${field}.`);
  }
}

function certificateFromEnvironment(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;

  // Vercel values may contain real newlines or escaped \n sequences.
  return value.replace(/\\r\\n|\\n/g, "\n");
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return host === "localhost" || host.endsWith(".localhost") || host === "::1" || /^127\./.test(host);
}

function getPoolConfig(
  connectionString: string,
  role: "runtime" | "migration",
  gatewayConfigured: boolean
): PoolConfig {
  let databaseURL: URL;
  try {
    databaseURL = new URL(connectionString);
  } catch {
    throw new Error(`${role === "runtime" ? "DATABASE_URL" : "MIGRATION_DATABASE_URL"} must be a valid PostgreSQL URL.`);
  }

  if (databaseURL.protocol !== "postgres:" && databaseURL.protocol !== "postgresql:") {
    throw new Error("Database URL must use the postgres or postgresql protocol.");
  }

  if (!databaseURL.hostname || !databaseURL.pathname || databaseURL.pathname === "/") {
    throw new Error("Database URL must include a database name and host.");
  }

  const conflictingTLSParameter = [...databaseURL.searchParams.keys()].find((key) =>
    SSL_URL_PARAMETERS.has(key.toLowerCase())
  );
  if (conflictingTLSParameter) {
    throw new Error("Remove SSL query options from the database URL; TLS is configured with DATABASE_*_CERT variables.");
  }

  const hostname = databaseURL.hostname.replace(/^\[|\]$/g, "");
  const localDatabase = isLoopbackHost(databaseURL.hostname);
  if (process.env.NODE_ENV === "production" && localDatabase) {
    throw new Error("Production database connections must use an external PostgreSQL host.");
  }

  const ca = certificateFromEnvironment("DATABASE_CA_CERT");
  const cert = certificateFromEnvironment("DATABASE_CLIENT_CERT");
  const key = certificateFromEnvironment("DATABASE_CLIENT_KEY");
  if (Boolean(cert) !== Boolean(key)) {
    throw new Error("DATABASE_CLIENT_CERT and DATABASE_CLIENT_KEY must be configured together.");
  }

  const useTLS =
    gatewayConfigured || process.env.NODE_ENV === "production" || !localDatabase || Boolean(ca || cert || key);
  if (process.env.NODE_ENV === "production" && !useTLS) {
    throw new Error("Production PostgreSQL connections require verified TLS.");
  }

  const poolConfig: PoolConfig = {
    host: hostname,
    port: databaseURL.port ? Number(databaseURL.port) : 5432,
    user: databaseURL.username ? decodeURLPart(databaseURL.username, "username") : undefined,
    password: databaseURL.password ? decodeURLPart(databaseURL.password, "password") : undefined,
    database: decodeURLPart(databaseURL.pathname.slice(1), "database name"),
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true,
  };

  if (useTLS) {
    poolConfig.ssl = {
      rejectUnauthorized: true,
      ...(ca ? { ca } : {}),
      ...(cert && key ? { cert, key } : {}),
      // Leave checkServerIdentity unset so Node verifies the certificate hostname.
    };
  }

  return poolConfig;
}

function createPool(connectionString: string, role: "runtime" | "migration"): Pool {
  const gatewayURL = process.env.DATABASE_GATEWAY_URL;
  const gatewayToken = process.env.DATABASE_GATEWAY_TOKEN;
  if (Boolean(gatewayURL) !== Boolean(gatewayToken)) {
    throw new Error("DATABASE_GATEWAY_URL and DATABASE_GATEWAY_TOKEN must be configured together.");
  }
  const gatewayConfigured = Boolean(gatewayURL && gatewayToken);
  const poolConfig = getPoolConfig(connectionString, role, gatewayConfigured);
  if (gatewayURL && gatewayToken) {
    poolConfig.stream = createDatabaseGatewayStreamFactory(gatewayURL, gatewayToken);
  }

  const pool = new Pool(poolConfig);
  pool.on("error", (error: NodeJS.ErrnoException) => {
    // Do not log connection strings, credentials, or server error messages.
    console.error("Unexpected idle PostgreSQL client error", error.code ? { code: error.code } : {});
  });
  return pool;
}

/** Return the reused runtime pool without opening a network connection yet. */
export function getDatabase(): Pool {
  if (poolRegistry.__tdBankingRuntimePool) return poolRegistry.__tdBankingRuntimePool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required to use the banking database.");

  poolRegistry.__tdBankingRuntimePool = createPool(connectionString, "runtime");
  return poolRegistry.__tdBankingRuntimePool;
}

/** Return a separate DDL-capable pool used only by the explicit migration CLI. */
export function getMigrationPool(): Pool {
  if (poolRegistry.__tdBankingMigrationPool) return poolRegistry.__tdBankingMigrationPool;

  const connectionString = process.env.MIGRATION_DATABASE_URL;
  if (!connectionString) throw new Error("MIGRATION_DATABASE_URL is required to run database migrations.");

  poolRegistry.__tdBankingMigrationPool = createPool(connectionString, "migration");
  return poolRegistry.__tdBankingMigrationPool;
}
