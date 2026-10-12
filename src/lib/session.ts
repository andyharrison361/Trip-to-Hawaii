// Session helpers for pages and server actions.

import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findHousehold, loadSnapshot, type Ctx, type HouseholdSnapshot } from "@/lib/core/context";

/** The signed-in user (verified), or null. Cached for the duration of a request. */
export const getSessionUser = cache(async () => {
  const db = await createClient();
  const { data, error } = await db.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;
  return { db, userId, email: (data.claims.email as string | undefined) ?? null };
});

export class NotSignedInError extends Error {
  constructor() {
    super("You're signed out. Please sign in again.");
  }
}

/** Context for code that needs a household. Throws if unavailable (for actions). */
export const getCtx = cache(async (): Promise<Ctx> => {
  const user = await getSessionUser();
  if (!user) throw new NotSignedInError();
  const found = await findHousehold(user.db, user.userId);
  if (!found) throw new Error("Set up your household first.");
  return { db: user.db, userId: user.userId, householdId: found.householdId, timezone: found.timezone };
});

/** For pages: redirects to sign-in or onboarding as needed. */
export const requireHousehold = cache(async (): Promise<{ ctx: Ctx; snap: HouseholdSnapshot }> => {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const found = await findHousehold(user.db, user.userId);
  if (!found) redirect("/onboarding");
  const ctx: Ctx = { db: user.db, userId: user.userId, householdId: found.householdId, timezone: found.timezone };
  const snap = await loadSnapshot(ctx);
  return { ctx, snap };
});
