// Turns stored items into what a planner page shows for a range of days.
//
// - One-off items appear on their date, done or not.
// - Repeating events appear on every date they happen. They're one row in the
//   database (the series); each date is an "occurrence".
// - Repeating tasks and chores are stored one occurrence at a time (finishing
//   one schedules the next). So you can plan ahead, their later dates are
//   "projected": shown faintly, not yet checkable.
//
// Pure functions: no database, easy to test, usable by a future native app.

import { addDays, daysBetween, type ISODate } from "./dates";
import { occurrencesBetween } from "./recurrence";
import type { TaskRow } from "./types";

export interface PlannerItem {
  /** Unique per row and date. */
  key: string;
  task: TaskRow;
  date: ISODate;
  /** A later date of a repeating task or chore, not yet a row of its own. */
  projected: boolean;
}

export type PlannerDays = Map<ISODate, PlannerItem[]>;

export function daysInRange(from: ISODate, to: ISODate): ISODate[] {
  const n = daysBetween(from, to);
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => addDays(from, i));
}

function compareItems(a: PlannerItem, b: PlannerItem): number {
  // Timed items first, in time order; then untimed events (all-day), then to-dos.
  const ta = a.task.due_time;
  const tb = b.task.due_time;
  if (ta && tb && ta !== tb) return ta < tb ? -1 : 1;
  if (ta && !tb) return -1;
  if (!ta && tb) return 1;
  const ka = a.task.kind === "event" ? 0 : 1;
  const kb = b.task.kind === "event" ? 0 : 1;
  if (ka !== kb) return ka - kb;
  if (a.projected !== b.projected) return a.projected ? 1 : -1;
  return a.task.created_at < b.task.created_at ? -1 : a.task.created_at > b.task.created_at ? 1 : 0;
}

/** Group items by day for `from`..`to` (inclusive). Every day in the range gets an entry. */
export function buildPlanner(rows: TaskRow[], from: ISODate, to: ISODate): PlannerDays {
  const days: PlannerDays = new Map(daysInRange(from, to).map((d) => [d, []]));
  const add = (task: TaskRow, date: ISODate, projected: boolean) => {
    const list = days.get(date);
    if (!list) return;
    if (list.some((i) => i.task.id === task.id)) return;
    list.push({ key: `${task.id}:${date}`, task, date, projected });
  };

  for (const task of rows) {
    if (task.status === "skipped" || !task.due_date) continue;
    const start = task.due_date;

    if (task.kind === "event") {
      if (start >= from && start <= to) add(task, start, false);
      if (task.recurrence && start <= to) {
        const lower = start > from ? start : from;
        for (const date of occurrencesBetween(task.recurrence, start, lower, to)) add(task, date, false);
      }
      continue;
    }

    if (start >= from && start <= to) add(task, start, false);
    // Project later dates of an open repeating to-do on a fixed schedule. Those
    // counted "from when it's done" can't be known in advance, so they aren't shown.
    if (task.status === "open" && task.recurrence && task.recurrence_mode === "fixed") {
      const after = addDays(start, 1);
      const lower = after > from ? after : from;
      for (const date of occurrencesBetween(task.recurrence, start, lower, to)) add(task, date, true);
    }
  }

  for (const list of days.values()) list.sort(compareItems);
  return days;
}

/** Open to-dos (tasks and chores) that were due before `today`. Events never go overdue. */
export function overdueItems(rows: TaskRow[], today: ISODate): TaskRow[] {
  return rows.filter((t) => t.kind !== "event" && t.status === "open" && t.due_date != null && t.due_date < today);
}

export interface PlannerFilter {
  /** Only items assigned to this member (by user id). */
  memberId?: string;
  kidId?: string;
}

export function matchesFilter(task: TaskRow, filter: PlannerFilter): boolean {
  if (filter.kidId && !task.kid_ids.includes(filter.kidId)) return false;
  if (filter.memberId && task.assignee_id !== filter.memberId) return false;
  return true;
}

export function filterPlanner(days: PlannerDays, filter: PlannerFilter): PlannerDays {
  if (!filter.memberId && !filter.kidId) return days;
  return new Map([...days].map(([date, items]) => [date, items.filter((i) => matchesFilter(i.task, filter))]));
}
