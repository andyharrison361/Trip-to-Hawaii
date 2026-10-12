// Areas of ownership, setup from the catalog, hand-offs and invites.

import { z } from "zod";
import { addDays, isValidISODate, nowInTimeZone, type ISODate } from "@/lib/dates";
import { firstOccurrence } from "@/lib/recurrence";
import { AREA_CATALOG, CATALOG_BY_KEY, type StarterTask } from "@/lib/catalog";
import type { AreaRow } from "@/lib/types";
import { ValidationError, type Ctx } from "./context";

const areaSchema = z.object({
  name: z.string().trim().min(1, "Give the area a name").max(60),
  icon: z.string().trim().max(8).nullable().optional().default(null),
  minimumStandard: z.string().max(2000).optional().default(""),
  ownerId: z.string().uuid().nullable(),
  category: z.string().max(40).nullable().optional().default(null),
  templateKey: z.string().max(40).nullable().optional().default(null),
});

export type AreaInput = z.input<typeof areaSchema>;

export async function createArea(ctx: Ctx, input: AreaInput): Promise<AreaRow> {
  const parsed = areaSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid area");
  const v = parsed.data;
  const { count } = await ctx.db
    .from("areas")
    .select("id", { count: "exact", head: true })
    .eq("household_id", ctx.householdId);
  const { data, error } = await ctx.db
    .from("areas")
    .insert({
      household_id: ctx.householdId,
      name: v.name,
      icon: v.icon || null,
      minimum_standard: v.minimumStandard,
      owner_id: v.ownerId,
      category: v.category,
      template_key: v.templateKey,
      sort_order: count ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AreaRow;
}

export async function updateArea(
  ctx: Ctx,
  id: string,
  input: { name: string; icon?: string | null; minimumStandard?: string },
): Promise<void> {
  const parsed = areaSchema.pick({ name: true, icon: true, minimumStandard: true }).safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid area");
  const v = parsed.data;
  const { error } = await ctx.db
    .from("areas")
    .update({ name: v.name, icon: v.icon || null, minimum_standard: v.minimumStandard })
    .eq("id", id)
    .eq("household_id", ctx.householdId);
  if (error) throw error;
}

/** Deleting an area keeps its tasks (they become "no area") so nothing silently disappears. */
export async function deleteArea(ctx: Ctx, id: string): Promise<void> {
  const { error } = await ctx.db.from("areas").delete().eq("id", id).eq("household_id", ctx.householdId);
  if (error) throw error;
}

export async function handOffArea(ctx: Ctx, areaId: string, toUserId: string, note?: string): Promise<void> {
  const { error } = await ctx.db.rpc("hand_off_area", {
    p_area_id: areaId,
    p_to_user: toUserId,
    p_note: note ?? null,
  });
  if (error) throw new ValidationError(error.message);
}

// ---------------------------------------------------------------------------
// Setup from the catalog
// ---------------------------------------------------------------------------

export interface AreaSelection {
  key: string;
  /** A member id, or null for "the partner I invited" (assigned when they join). */
  ownerId: string | null;
}

export async function createAreasFromCatalog(ctx: Ctx, selections: AreaSelection[]): Promise<AreaRow[]> {
  const order = new Map(AREA_CATALOG.map((a, i) => [a.key, i]));
  const rows = selections
    .filter((s) => CATALOG_BY_KEY.has(s.key))
    .sort((a, b) => order.get(a.key)! - order.get(b.key)!)
    .map((s, i) => {
      const t = CATALOG_BY_KEY.get(s.key)!;
      return {
        household_id: ctx.householdId,
        name: t.name,
        icon: t.icon,
        category: t.category,
        minimum_standard: t.minimumStandard,
        template_key: t.key,
        owner_id: s.ownerId,
        sort_order: i,
      };
    });
  if (!rows.length) return [];
  const { data, error } = await ctx.db.from("areas").insert(rows).select("*");
  if (error) throw error;
  return data as AreaRow[];
}

/** The first due date we suggest for a starter task. */
export function defaultFirstDue(task: StarterTask, today: ISODate): ISODate | null {
  const from = addDays(today, task.startInDays ?? 0);
  if (!task.rule) return from;
  if (task.mode === "after_completion") return from;
  return firstOccurrence(task.rule, from);
}

export interface StarterPick {
  areaId: string;
  taskIndex: number;
  dueDate: ISODate | null;
}

export async function createStarterTasks(ctx: Ctx, picks: StarterPick[]): Promise<number> {
  const { data: areas, error } = await ctx.db
    .from("areas")
    .select("id, owner_id, template_key")
    .eq("household_id", ctx.householdId);
  if (error) throw error;
  const byId = new Map((areas ?? []).map((a) => [a.id as string, a]));
  const today = nowInTimeZone(ctx.timezone).date;

  const rows = picks.flatMap((p) => {
    const area = byId.get(p.areaId);
    const template = area?.template_key ? CATALOG_BY_KEY.get(area.template_key) : undefined;
    const task = template?.starterTasks[p.taskIndex];
    if (!area || !task) return [];
    const id = crypto.randomUUID();
    const due = p.dueDate && isValidISODate(p.dueDate) ? p.dueDate : defaultFirstDue(task, today);
    return [
      {
        id,
        household_id: ctx.householdId,
        area_id: area.id,
        title: task.title,
        notes: task.notes ?? "",
        assignee_id: area.owner_id,
        created_by: ctx.userId,
        due_date: due,
        remind_days_before: task.remindDaysBefore ?? null,
        recurrence: task.rule ?? null,
        recurrence_mode: task.mode ?? "fixed",
        series_id: task.rule ? id : null,
      },
    ];
  });
  if (!rows.length) return 0;
  const { error: insertError } = await ctx.db.from("tasks").insert(rows);
  if (insertError) throw insertError;
  return rows.length;
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

/** Make a fresh invite link token, replacing any unused ones. */
export async function createInvite(ctx: Ctx, inviteeName?: string | null): Promise<string> {
  await ctx.db
    .from("household_invites")
    .delete()
    .eq("household_id", ctx.householdId)
    .is("accepted_at", null);
  const { data, error } = await ctx.db.rpc("create_invite", {
    p_household_id: ctx.householdId,
    p_invitee_name: inviteeName ?? null,
  });
  if (error) throw error;
  return data as string;
}
