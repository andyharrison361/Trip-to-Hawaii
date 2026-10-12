// Server-side helper that renders tasks with their area and assignee looked up.

import type { HouseholdSnapshot } from "@/lib/core/context";
import type { TaskRow as Task } from "@/lib/types";
import { TaskRow } from "./task-row";

export function TaskList({
  tasks,
  snap,
  showAssignee = "others",
  hideArea,
}: {
  tasks: Task[];
  snap: HouseholdSnapshot;
  /** "others" shows an avatar only on tasks that aren't mine. */
  showAssignee?: "always" | "others" | "never";
  hideArea?: boolean;
}) {
  const areas = new Map(snap.areas.map((a) => [a.id, a]));
  const pending = snap.members.find((m) => m.pending);
  return (
    <ul className="divide-y divide-line rounded-3xl bg-card px-3 ring-1 ring-line">
      {tasks.map((t) => {
        const member = t.assignee_id ? snap.members.find((m) => m.id === t.assignee_id) : pending;
        const show =
          showAssignee === "always" || (showAssignee === "others" && t.assignee_id !== snap.me.id);
        return (
          <TaskRow
            key={t.id}
            task={t}
            today={snap.today}
            area={t.area_id ? areas.get(t.area_id) : null}
            assignee={show && member ? member : null}
            hideArea={hideArea}
          />
        );
      })}
    </ul>
  );
}
