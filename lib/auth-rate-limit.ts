import { createHmac } from "node:crypto";

type AttemptBucket = { count: number; resetAt: number };

const attempts = new Map<string, AttemptBucket>();
const MAX_BUCKETS = 5_000;

/** Small process-local guard for auth actions that call the API directly. */
export function checkAuthRateLimit(action: "sign-in" | "sign-up", email: string): void {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("Authentication is not configured.");

  const now = Date.now();
  attempts.forEach((bucket, key) => {
    if (bucket.resetAt <= now) attempts.delete(key);
  });

  const limit = action === "sign-in" ? 10 : 5;
  const windowMs = action === "sign-in" ? 15 * 60_000 : 60 * 60_000;
  const key = createHmac("sha256", secret)
    .update(`${action}:${email.toLowerCase()}`)
    .digest("hex");
  let bucket = attempts.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    attempts.delete(key);
    attempts.set(key, bucket);
  }

  if (bucket.count >= limit) {
    throw new Error("Too many authentication attempts. Try again later.");
  }

  bucket.count += 1;
  while (attempts.size > MAX_BUCKETS) {
    const oldestKey = attempts.keys().next().value;
    if (!oldestKey) break;
    attempts.delete(oldestKey);
  }
}
