// Row shapes as stored in Postgres (see supabase/migrations).

import type { ISODate } from "./dates";
import type { RecurrenceMode } from "./recurrence";

export interface ProfileRow {
  id: string;
  display_name: string;
  timezone: string;
  default_reminder_time: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  digest_enabled: boolean;
  digest_time: string;
  max_nudges: number;
}

export interface HouseholdRow {
  id: string;
  name: string;
  timezone: string;
  max_members: number;
}

export interface AreaRow {
  id: string;
  household_id: string;
  name: string;
  icon: string | null;
  category: string | null;
  owner_id: string | null;
  minimum_standard: string;
  template_key: string | null;
  sort_order: number;
  created_at: string;
}

export type TaskStatus = "open" | "done" | "skipped";

export interface TaskRow {
  id: string;
  household_id: string;
  area_id: string | null;
  title: string;
  notes: string;
  assignee_id: string | null;
  created_by: string | null;
  due_date: ISODate | null;
  due_time: string | null;
  remind_days_before: number | null;
  reminder_time: string | null;
  recurrence: string | null;
  recurrence_mode: RecurrenceMode;
  series_id: string | null;
  status: TaskStatus;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AreaHandoffRow {
  id: string;
  area_id: string;
  from_user: string | null;
  to_user: string | null;
  note: string | null;
  created_at: string;
}

/** A person in the household. `pending` = invited, hasn't joined yet (id is null). */
export interface Member {
  id: string | null;
  name: string;
  firstName: string;
  initial: string;
  /** 0, 1, … — picks a distinct avatar colour per person. */
  tone: number;
  pending?: boolean;
}

export const TASK_COLUMNS =
  "id, household_id, area_id, title, notes, assignee_id, created_by, due_date, due_time, remind_days_before, reminder_time, recurrence, recurrence_mode, series_id, status, completed_at, completed_by, created_at, updated_at";
