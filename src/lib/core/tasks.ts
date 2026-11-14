// Task operations shared by the app, the REST API and future clients.

import { z } from "zod";
import { addDays, isValidISODate, normalizeTime, nowInTimeZone, type ISODate } from "@/lib/dates";
import { isValidRule, nextDueDate } from "@/lib/recurrence";
import { parseQuickAdd } from "@/lib/quick-add";
import { bundlesFor, CATALOG_BY_KEY, keywordsFor } from "@/lib/catalog";
import { TASK_COLUMNS, type AreaRow, type TaskRow } from "@/lib/types";
import { NotFoundError, ValidationError, loadSnapshot, type Ctx } from "./context";

const uuid = z.string().uuid();

export const taskInputSchema = z
  .object({
  kind: z.enum(["task", "chore", "event"]).optional().default("task"),
  title: z.string().trim().min(1, "Give it a title").max(200),
  notes: z.string().max(5000).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  kidIds: z.array(uuid).max(20).optional().default([]),
  areaId: uuid.nullable().optional().default(null),
  assigneeId: uuid.nullable().optional(),
  dueDate: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .refine((v) => v == null || v === "" || isValidISODate(v), "Invalid date")
    .transform((v) => (v ? v : null)),
  dueTime: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .transform((v) => normalizeTime(v)),
  endTime: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .transform((v) => normalizeTime(v)),
  recurrence: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .transform((v) => (v ? v.replace(/^RRULE:/i, "").trim() : null))
    .refine((v) => v == null || isValidRule(v), "That repeat rule isn't valid"),
  recurrenceMode: z.enum(["fixed", "after_completion"]).optional().default("fixed"),
  remindDaysBefore: z.number().int().min(0).max(90).nullable().optional().default(null),
  reminderTime: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .transform((v) => normalizeTime(v)),
  })
  .refine((v) => v.kind !== "event" || v.dueDate != null, { message: "Events need a date" })
  .refine((v) => !v.endTime || !v.dueTime || v.endTime >= v.dueTime, { message: "The end time is before the start time" })
  // Only events have an end time; a recurrence counted from completion makes no sense for them.
  .transform((v) => ({
    ...v,
    endTime: v.kind === "event" && v.dueTime ? v.endTime : null,
    recurrenceMode: v.kind === "event" ? ("fixed" as const) : v.recurrenceMode,
  }));

export type TaskInput = z.input<typeof taskInputSchema>;

function parseInput(input: unknown) {
  const result = taskInputSchema.safeParse(input);
  if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? "Invalid task");
  return result.data;
}

async function getArea(ctx: Ctx, areaId: string | null): Promise<AreaRow | null> {
  if (!areaId) return null;
  const { data, error } = await ctx.db
    .from("areas")
    .select("*")
    .eq("id", areaId)
    .eq("household_id", ctx.householdId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ValidationError("That area doesn't exist");
  return data as AreaRow;
}

export async function getTask(ctx: Ctx, id: string): Promise<TaskRow> {
  const { data, error } = await ctx.db
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("id", id)
    .eq("household_id", ctx.householdId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Task not found");
  return data as TaskRow;
}

export async function createTask(ctx: Ctx, input: TaskInput): Promise<TaskRow> {
  const v = parseInput(input);
  const area = await getArea(ctx, v.areaId);
  // Default assignee: the area's owner (null while the invited partner hasn't joined),
  // otherwise whoever is adding it.
  const assigneeId = v.assigneeId !== undefined ? v.assigneeId : area ? area.owner_id : ctx.userId;

  const id = crypto.randomUUID();
  const { data, error } = await ctx.db
    .from("tasks")
    .insert({
      id,
      household_id: ctx.householdId,
      area_id: v.areaId,
      kind: v.kind,
      title: v.title,
      notes: v.notes,
      location: v.location,
      kid_ids: v.kidIds,
      assignee_id: assigneeId,
      created_by: ctx.userId,
      due_date: v.dueDate,
      due_time: v.dueTime,
      end_time: v.endTime,
      remind_days_before: v.remindDaysBefore,
      reminder_time: v.reminderTime,
      recurrence: v.recurrence,
      recurrence_mode: v.recurrenceMode,
      series_id: v.recurrence ? id : null,
    })
    .select(TASK_COLUMNS)
    .single();
  if (error) throw error;
  return data as TaskRow;
}

export async function updateTask(ctx: Ctx, id: string, input: TaskInput): Promise<TaskRow> {
  const existing = await getTask(ctx, id);
  const v = parseInput(input);
  await getArea(ctx, v.areaId);
  const { data, error } = await ctx.db
    .from("tasks")
    .update({
      area_id: v.areaId,
      kind: v.kind,
      title: v.title,
      notes: v.notes,
      location: v.location,
      kid_ids: v.kidIds,
      assignee_id: v.assigneeId === undefined ? existing.assignee_id : v.assigneeId,
      due_date: v.dueDate,
      due_time: v.dueTime,
      end_time: v.endTime,
      remind_days_before: v.remindDaysBefore,
      reminder_time: v.reminderTime,
      recurrence: v.recurrence,
      recurrence_mode: v.recurrenceMode,
      series_id: v.recurrence ? (existing.series_id ?? existing.id) : existing.series_id,
    })
    .eq("id", id)
    .eq("household_id", ctx.householdId)
    .select(TASK_COLUMNS)
    .single();
  if (error) throw error;
  return data as TaskRow;
}

export async function deleteTask(ctx: Ctx, id: string): Promise<void> {
  const { error } = await ctx.db.from("tasks").delete().eq("id", id).eq("household_id", ctx.householdId);
  if (error) throw error;
}

/**
 * Mark a task done, recording who and when. For repeating tasks this creates the
 * next occurrence. Safe against double taps: only the first completion counts.
 */
export async function completeTask(
  ctx: Ctx,
  id: string,
): Promise<{ task: TaskRow; next: TaskRow | null }> {
  const completedOn = nowInTimeZone(ctx.timezone).date;
  const { data, error } = await ctx.db
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString(), completed_by: ctx.userId })
    .eq("id", id)
    .eq("household_id", ctx.householdId)
    .eq("status", "open")
    .neq("kind", "event")
    .select(TASK_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // Already completed (or missing): report the current state without side effects.
    const current = await getTask(ctx, id);
    if (current.kind === "event") throw new ValidationError("Events don't need checking off");
    return { task: current, next: null };
  }
  const task = data as TaskRow;
  if (!task.recurrence) return { task, next: null };

  const nextDate = nextDueDate({
    rule: task.recurrence,
    mode: task.recurrence_mode,
    dueDate: task.due_date,
    completedOn,
  });
  if (!nextDate) return { task, next: null };

  const { data: next, error: nextError } = await ctx.db
    .from("tasks")
    .insert({
      household_id: task.household_id,
      area_id: task.area_id,
      kind: task.kind,
      title: task.title,
      notes: task.notes,
      location: task.location,
      kid_ids: task.kid_ids,
      assignee_id: task.assignee_id,
      created_by: task.created_by,
      due_date: nextDate,
      due_time: task.due_time,
      end_time: task.end_time,
      remind_days_before: task.remind_days_before,
      reminder_time: task.reminder_time,
      recurrence: task.recurrence,
      recurrence_mode: task.recurrence_mode,
      series_id: task.series_id ?? task.id,
    })
    .select(TASK_COLUMNS)
    .single();
  if (nextError) throw nextError;
  return { task, next: next as TaskRow };
}

/** Undo a completion. Removes the next occurrence it created, if that's still untouched. */
export async function reopenTask(ctx: Ctx, id: string, nextId?: string | null): Promise<TaskRow> {
  if (nextId) {
    const next = await getTask(ctx, nextId).catch(() => null);
    if (next && next.status === "open") {
      await deleteTask(ctx, nextId);
    }
  }
  const { data, error } = await ctx.db
    .from("tasks")
    .update({ status: "open", completed_at: null, completed_by: null })
    .eq("id", id)
    .eq("household_id", ctx.householdId)
    .select(TASK_COLUMNS)
    .single();
  if (error) throw error;
  return data as TaskRow;
}

/** Stop a repeating task from creating more occurrences (keeps this one). */
export async function stopRepeating(ctx: Ctx, id: string): Promise<void> {
  const { error } = await ctx.db
    .from("tasks")
    .update({ recurrence: null })
    .eq("id", id)
    .eq("household_id", ctx.householdId);
  if (error) throw error;
}

/** Create a task from one line of natural language. */
export async function quickAdd(ctx: Ctx, text: string, overrides: Partial<TaskInput> = {}): Promise<TaskRow> {
  const snap = await loadSnapshot(ctx);
  const draft = parseQuickAdd(text, {
    currentUserId: ctx.userId,
    now: snap.now,
    members: snap.members.filter((m) => m.id).map((m) => ({ id: m.id!, name: m.name })),
    kids: snap.kids.map((k) => ({ id: k.id, name: k.name })),
    areas: snap.areas.map((a) => ({ id: a.id, name: a.name, ownerId: a.owner_id, keywords: keywordsFor(a.template_key) })),
  });
  return createTask(ctx, {
    kind: draft.kind,
    title: draft.title || text.trim(),
    kidIds: draft.kidIds,
    areaId: draft.areaId,
    assigneeId: draft.assigneeId,
    dueDate: draft.dueDate,
    dueTime: draft.dueTime,
    recurrence: draft.recurrence?.rule ?? null,
    recurrenceMode: draft.recurrence?.mode ?? "fixed",
    ...overrides,
  });
}

/** Create a checklist of tasks ("New order", "Plan a trip") relative to a date. */
export async function createFromBundle(
  ctx: Ctx,
  args: { areaId: string; bundleKey: string; name: string; date: ISODate },
): Promise<TaskRow[]> {
  const area = await getArea(ctx, args.areaId);
  if (!area) throw new ValidationError("Area not found");
  const bundle = bundlesFor(area.template_key).find((b) => b.key === args.bundleKey);
  if (!bundle) throw new ValidationError("That checklist isn't available here");
  if (!isValidISODate(args.date)) throw new ValidationError("Pick a date");

  const { data: areas, error } = await ctx.db
    .from("areas")
    .select("id, owner_id, template_key")
    .eq("household_id", ctx.householdId)
    .is("archived_at", null);
  if (error) throw error;
  const byKey = new Map((areas ?? []).map((a) => [a.template_key as string, a]));
  const today = nowInTimeZone(ctx.timezone).date;
  const label = args.name.trim();

  const rows = bundle.tasks.map((t) => {
    const target = (t.areaKey && byKey.get(t.areaKey)) || area;
    let due = addDays(args.date, t.offsetDays);
    if (due < today) due = today;
    return {
      household_id: ctx.householdId,
      area_id: target.id,
      title: label ? `${t.title} (${label})` : t.title,
      assignee_id: target.owner_id,
      created_by: ctx.userId,
      due_date: due,
    };
  });
  const { data, error: insertError } = await ctx.db.from("tasks").insert(rows).select(TASK_COLUMNS);
  if (insertError) throw insertError;
  return data as TaskRow[];
}

/** Starter tasks from the catalog that this area doesn't have yet. */
export function suggestionsFor(area: AreaRow, existingTitles: string[]) {
  const template = area.template_key ? CATALOG_BY_KEY.get(area.template_key) : undefined;
  if (!template) return [];
  const have = new Set(existingTitles.map((t) => t.toLowerCase()));
  return template.starterTasks
    .map((t, index) => ({ ...t, index }))
    .filter((t) => !have.has(t.title.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listOpenTasks(
  ctx: Ctx,
  opts: { assigneeId?: string; areaId?: string; dueOnOrBefore?: ISODate; dueAfter?: ISODate; noDate?: boolean; limit?: number } = {},
): Promise<TaskRow[]> {
  const today = nowInTimeZone(ctx.timezone).date;
  let q = ctx.db
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("household_id", ctx.householdId)
    .eq("status", "open")
    // Events are never checked off: once a one-off event has passed, it's no longer "open".
    .or(`kind.neq.event,due_date.gte.${today},recurrence.not.is.null`);
  if (opts.assigneeId) q = q.eq("assignee_id", opts.assigneeId);
  if (opts.areaId) q = q.eq("area_id", opts.areaId);
  if (opts.noDate) q = q.is("due_date", null);
  if (opts.dueOnOrBefore) q = q.lte("due_date", opts.dueOnOrBefore);
  if (opts.dueAfter) q = q.gt("due_date", opts.dueAfter);
  q = q
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

/**
 * Everything the planner needs for a date range: items dated in the range
 * (open or done), plus open repeating items that started earlier, whose later
 * occurrences may fall in the range (see lib/planner.ts).
 */
export async function listPlannerRows(ctx: Ctx, from: ISODate, to: ISODate): Promise<TaskRow[]> {
  if (!isValidISODate(from) || !isValidISODate(to)) throw new ValidationError("Invalid date range");
  const { data, error } = await ctx.db
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("household_id", ctx.householdId)
    .neq("status", "skipped")
    .or(`and(due_date.gte.${from},due_date.lte.${to}),and(status.eq.open,recurrence.not.is.null,due_date.lte.${to})`)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: true })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

export async function listCompleted(
  ctx: Ctx,
  opts: { areaId?: string; since?: string; limit?: number } = {},
): Promise<TaskRow[]> {
  let q = ctx.db
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("household_id", ctx.householdId)
    .eq("status", "done");
  if (opts.areaId) q = q.eq("area_id", opts.areaId);
  if (opts.since) q = q.gte("completed_at", opts.since);
  q = q.order("completed_at", { ascending: false }).limit(opts.limit ?? 20);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}
