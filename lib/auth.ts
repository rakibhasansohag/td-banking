import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import type { Pool } from "pg";
import { getDatabase } from "./database.ts";

function getRuntimeConfig() {
  const secret = process.env.BETTER_AUTH_SECRET;
  let previewURL: string | undefined;
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    let deploymentURL: URL;
    try {
      deploymentURL = new URL(`https://${process.env.VERCEL_URL}`);
    } catch {
      throw new Error("VERCEL_URL must be a valid Vercel preview hostname.");
    }

    if (
      !deploymentURL.hostname.endsWith(".vercel.app") ||
      deploymentURL.hostname !== process.env.VERCEL_URL.toLowerCase() ||
      deploymentURL.pathname !== "/" ||
      deploymentURL.search ||
      deploymentURL.hash
    ) {
      throw new Error("VERCEL_URL must be a valid Vercel preview hostname.");
    }

    previewURL = deploymentURL.origin;
  }

  // VERCEL_URL is a trusted deployment environment variable, never a request header.
  // Use the deployment-specific origin for preview cookies even if production has a fixed URL.
  const baseURL = previewURL || process.env.BETTER_AUTH_URL;

  if (!secret || secret.length < 32 || /^(change-me|secret|your[-_])/i.test(secret)) {
    throw new Error("BETTER_AUTH_SECRET must be a unique secret with at least 32 characters.");
  }

  if (!baseURL) throw new Error("Set BETTER_AUTH_URL to the public origin for this app.");

  let parsedURL: URL;
  try {
    parsedURL = new URL(baseURL);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL.");
  }

  const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (
    parsedURL.protocol !== "https:" &&
    !(parsedURL.protocol === "http:" && loopbackHosts.has(parsedURL.hostname))
  ) {
    throw new Error("BETTER_AUTH_URL must use HTTPS outside local development.");
  }

  return { secret, baseURL: parsedURL.origin };
}

/** Share the same Better Auth schema/options between runtime and the migration CLI. */
export function createAuthOptions(database: Pool) {
  const { secret, baseURL } = getRuntimeConfig();

  return {
    database,
    secret,
    baseURL,
    emailAndPassword: {
      enabled: true,
    },
    telemetry: { enabled: false },
    plugins: [nextCookies()],
  };
}

function createAuthInstance() {
  return betterAuth(createAuthOptions(getDatabase()));
}

type AuthInstance = ReturnType<typeof createAuthInstance>;

let authInstance: AuthInstance | undefined;

/** Create the Better Auth instance on demand so builds do not open user data. */
export function getAuth(): AuthInstance {
  if (authInstance) return authInstance;
  authInstance = createAuthInstance();
  return authInstance;
}
