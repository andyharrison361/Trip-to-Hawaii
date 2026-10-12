// Who is asking, and which household are they in? Every core operation takes a
// Ctx so it can run the same way from a page, a server action, the REST API,
// a scheduled job, or (later) an AI assistant.

import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TIMEZONE, nowInTimeZone, type ISODate } from "@/lib/dates";
import type { AreaRow, HouseholdRow, Member, ProfileRow } from "@/lib/types";

export interface Ctx {
  db: SupabaseClient;
  userId: string;
  householdId: string;
  timezone: string;
}

export interface HouseholdSnapshot {
  household: HouseholdRow;
  me: ProfileRow;
  members: Member[];
  areas: AreaRow[];
  today: ISODate;
  now: ReturnType<typeof nowInTimeZone>;
}

export class NotFoundError extends Error {}
export class ValidationError extends Error {}

export function toMember(id: string | null, name: string, pending = false): Member {
  const clean = name.trim() || "Partner";
  return {
    id,
    name: clean,
    firstName: clean.split(/\s+/)[0],
    initial: clean.charAt(0).toUpperCase(),
    tone: 0,
    pending,
  };
}

/** Find the household a user belongs to (v1: one household per person). */
export async function findHousehold(
  db: SupabaseClient,
  userId: string,
): Promise<{ householdId: string; timezone: string } | null> {
  const { data, error } = await db
    .from("household_members")
    .select("household_id, households(timezone)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const household = data.households as unknown as { timezone: string } | null;
  return { householdId: data.household_id as string, timezone: household?.timezone ?? DEFAULT_TIMEZONE };
}

export async function loadSnapshot(ctx: Ctx): Promise<HouseholdSnapshot> {
  const { db, householdId, userId } = ctx;
  const [householdRes, membersRes, areasRes, inviteRes] = await Promise.all([
    db.from("households").select("id, name, timezone, max_members").eq("id", householdId).single(),
    db.from("household_members").select("user_id, joined_at").eq("household_id", householdId).order("joined_at"),
    db
      .from("areas")
      .select("*")
      .eq("household_id", householdId)
      .is("archived_at", null)
      .order("sort_order")
      .order("created_at"),
    db
      .from("household_invites")
      .select("invitee_name")
      .eq("household_id", householdId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (householdRes.error) throw householdRes.error;
  if (membersRes.error) throw membersRes.error;
  if (areasRes.error) throw areasRes.error;

  const memberIds = (membersRes.data ?? []).map((m) => m.user_id as string);
  const profilesRes = await db.from("profiles").select("*").in("id", memberIds);
  if (profilesRes.error) throw profilesRes.error;
  const profiles = new Map((profilesRes.data as ProfileRow[]).map((p) => [p.id, p]));

  const members: Member[] = memberIds.map((id) => toMember(id, profiles.get(id)?.display_name ?? ""));
  const household = householdRes.data as HouseholdRow;
  if (members.length < household.max_members) {
    const pendingName = inviteRes.data?.invitee_name;
    members.push(toMember(null, pendingName || "Partner", true));
  }

  // Distinct initials ("An" / "Al" when both start with A) and colours per person.
  const clashes = new Set(members.filter((m, i) => members.some((o, j) => j !== i && o.initial === m.initial)));
  members.forEach((m, i) => {
    m.tone = i;
    if (clashes.has(m)) m.initial = m.firstName.slice(0, 2);
  });

  const me = profiles.get(userId);
  if (!me) throw new NotFoundError("Profile not found");
  const now = nowInTimeZone(household.timezone);

  return {
    household,
    me,
    members,
    areas: (areasRes.data ?? []) as AreaRow[],
    today: now.date,
    now,
  };
}
