"use server";

import { headers } from "next/headers";
import { cache } from "react";
import { z } from "zod";
import { getAuth } from "../auth";
import { checkAuthRateLimit } from "../auth-rate-limit";
import type { AuthUserView } from "../auth.types";

const signUpSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(100),
});

const signInSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

function toUserView(user: { id: string; email: string; name: string }): AuthUserView {
  const [firstName = "", ...lastNameParts] = user.name.trim().split(/\s+/);

  return {
    $id: user.id,
    userId: user.id,
    email: user.email,
    name: user.name,
    firstName,
    lastName: lastNameParts.join(" "),
  };
}

export async function signUp(input: { email: string; password: string; name: string }) {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) throw new Error("Enter a valid name, email, and password of at least 8 characters.");

  checkAuthRateLimit("sign-up", parsed.data.email);
  const result = await getAuth().api.signUpEmail({
    body: {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      name: parsed.data.name,
    },
    headers: await headers(),
  });

  return toUserView(result.user);
}

export async function signIn(input: { email: string; password: string }) {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) throw new Error("Enter a valid email and password.");

  checkAuthRateLimit("sign-in", parsed.data.email);
  const result = await getAuth().api.signInEmail({
    body: {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
    },
    headers: await headers(),
  });

  return toUserView(result.user);
}

const readSessionUser = cache(async (): Promise<AuthUserView | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user ? toUserView(session.user) : null;
});

export async function getLoggedInUser(): Promise<AuthUserView | null> {
  return readSessionUser();
}

export async function logoutAccount(): Promise<boolean> {
  await getAuth().api.signOut({ headers: await headers() });
  return true;
}
