import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import { getDatabase } from "./database";

function createAuthInstance() {
  const { secret, baseURL } = getRuntimeConfig();

  return betterAuth({
    database: getDatabase(),
    secret,
    baseURL,
    emailAndPassword: {
      enabled: true,
    },
    telemetry: { enabled: false },
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof createAuthInstance>;

let authInstance: AuthInstance | undefined;
let schemaMigration: Promise<void> | undefined;

function getRuntimeConfig() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;

  if (!secret || secret.length < 32 || /^(change-me|secret|your[-_])/i.test(secret)) {
    throw new Error("BETTER_AUTH_SECRET must be a unique secret with at least 32 characters.");
  }

  if (!baseURL) {
    throw new Error("Set BETTER_AUTH_URL to the public origin for this app.");
  }

  let parsedURL: URL;
  try {
    parsedURL = new URL(baseURL);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL.");
  }

  const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (parsedURL.protocol !== "https:" && !(parsedURL.protocol === "http:" && loopbackHosts.has(parsedURL.hostname))) {
    throw new Error("BETTER_AUTH_URL must use HTTPS outside local development.");
  }

  return { secret, baseURL: parsedURL.origin };
}

/** Create the Better Auth instance on demand so builds do not open user data. */
export function getAuth(): AuthInstance {
  if (authInstance) return authInstance;
  authInstance = createAuthInstance();
  return authInstance;
}

/** Apply Better Auth's versioned schema on first runtime use. */
export async function ensureAuthSchema(): Promise<void> {
  if (!schemaMigration) {
    schemaMigration = (async () => {
      const auth = getAuth();
      const migrations = await getMigrations(auth.options);
      await migrations.runMigrations();
    })().catch((error) => {
      schemaMigration = undefined;
      throw error;
    });
  }

  await schemaMigration;
}
