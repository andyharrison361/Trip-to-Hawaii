// Personal API tokens for things like a Siri Shortcut. Only a SHA-256 hash is stored.

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ctx } from "./context";

export const TOKEN_PREFIX = "lp_";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createApiToken(ctx: Ctx, name: string): Promise<string> {
  const token = TOKEN_PREFIX + randomBytes(24).toString("base64url");
  const { error } = await ctx.db.from("api_tokens").insert({
    user_id: ctx.userId,
    household_id: ctx.householdId,
    name: name.trim() || "Shortcut",
    token_hash: hashToken(token),
  });
  if (error) throw error;
  return token;
}

export async function listApiTokens(ctx: Ctx) {
  const { data, error } = await ctx.db
    .from("api_tokens")
    .select("id, name, created_at, last_used_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function revokeApiToken(ctx: Ctx, id: string) {
  const { error } = await ctx.db.from("api_tokens").delete().eq("id", id).eq("user_id", ctx.userId);
  if (error) throw error;
}

/** Look up a token with the admin client. Returns the user and household it belongs to. */
export async function resolveApiToken(admin: SupabaseClient, token: string) {
  const { data, error } = await admin
    .from("api_tokens")
    .select("id, user_id, household_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error || !data) return null;
  // Make sure they're still in that household.
  const { data: member } = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", data.household_id)
    .eq("user_id", data.user_id)
    .maybeSingle();
  if (!member) return null;
  await admin.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { userId: data.user_id as string, householdId: data.household_id as string };
}
