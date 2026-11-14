// Server-side helper that renders items with their area, assignee and kids looked up.

import type { HouseholdSnapshot } from "@/lib/core/context";
import type { PlannerItem } from "@/lib/planner";
import type { TaskRow as Task } from "@/lib/types";
import { TaskRow } from "./task-row";
import { cx } from "./ui";

export function TaskList({
  tasks,
  items,
  snap,
  showAssignee = "others",
  hideArea,
  hideDate,
  variant = "list",
}: {
  tasks?: Task[];
  /** Planner items (a row on a specific date, possibly projected). */
  items?: PlannerItem[];
  snap: HouseholdSnapshot;
  /** "others" shows an avatar only on items that aren't mine. */
  showAssignee?: "always" | "others" | "never";
  hideArea?: boolean;
  hideDate?: boolean;
  variant?: "list" | "compact";
}) {
  const areas = new Map(snap.areas.map((a) => [a.id, a]));
  const kids = new Map(snap.kids.map((k) => [k.id, k]));
  const pending = snap.members.find((m) => m.pending);
  const rows: { key: string; task: Task; date: string | null; projected: boolean }[] =
    items ?? (tasks ?? []).map((t) => ({ key: t.id, task: t, date: t.due_date, projected: false }));

  return (
    <ul
      className={cx(
        variant === "list" ? "divide-y divide-line rounded-3xl bg-card px-3 ring-1 ring-line" : "divide-y divide-line/70",
      )}
    >
      {rows.map(({ key, task: t, date, projected }) => {
        // Unassigned events are shared ("everyone"), not waiting for the invited partner.
        const member = t.assignee_id ? snap.members.find((m) => m.id === t.assignee_id) : t.kind === "event" ? null : pending;
        const show = showAssignee === "always" || (showAssignee === "others" && t.assignee_id !== snap.me.id);
        return (
          <TaskRow
            key={key}
            task={t}
            date={date}
            today={snap.today}
            projected={projected}
            area={t.area_id ? areas.get(t.area_id) : null}
            assignee={show && member ? member : null}
            kids={t.kid_ids.flatMap((id) => {
              const k = kids.get(id);
              return k ? [{ id: k.id, name: k.name, color: k.color }] : [];
            })}
            hideArea={hideArea}
            hideDate={hideDate}
            variant={variant}
          />
        );
      })}
    </ul>
  );
}
