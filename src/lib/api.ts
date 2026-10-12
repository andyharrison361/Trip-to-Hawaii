// Authentication and helpers for the REST API (/api/v1/*).
//
// Two ways to authenticate, both as "Authorization: Bearer <token>":
//   1. A personal API token from Settings → Shortcuts (starts with "lp_").
//      Meant for a Siri Shortcut or other simple automations.
//   2. A Supabase access token (JWT), which a future native app would send.

import "server-only";

import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { resolveApiToken, TOKEN_PREFIX } from "@/lib/core/api-tokens";
import { findHousehold, NotFoundError, ValidationError, type Ctx } from "@/lib/core/context";
import { DEFAULT_TIMEZONE } from "@/lib/dates";

export async function getApiCtx(request: Request): Promise<Ctx | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  if (!token) return null;

  if (token.startsWith(TOKEN_PREFIX)) {
    const admin = createAdminClient();
    const found = await resolveApiToken(admin, token);
    if (!found) return null;
    const { data } = await admin.from("households").select("timezone").eq("id", found.householdId).single();
    // The admin client bypasses row-level security; every core query filters by householdId.
    return { db: admin, userId: found.userId, householdId: found.householdId, timezone: data?.timezone ?? DEFAULT_TIMEZONE };
  }

  const db = createSupabaseClient(supabaseUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return null;
  const found = await findHousehold(db, userId);
  if (!found) return null;
  return { db, userId, householdId: found.householdId, timezone: found.timezone };
}

export function unauthorized() {
  return NextResponse.json({ error: "Missing or invalid token" }, { status: 401 });
}

export function apiError(e: unknown) {
  if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    // Siri Shortcuts sometimes send plain text; treat it as { text }.
    return {};
  }
}
