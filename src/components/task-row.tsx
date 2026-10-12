"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { completeTaskAction, reopenTaskAction } from "@/app/actions";
import { daysBetween, formatDue, formatShortDate } from "@/lib/dates";
import type { TaskRow as Task } from "@/lib/types";
import { CheckIcon, RepeatIcon } from "./icons";
import { useToast } from "./toast";
import { Avatar, cx } from "./ui";

export interface TaskRowProps {
  task: Pick<Task, "id" | "title" | "due_date" | "due_time" | "recurrence" | "status">;
  today: string;
  area?: { name: string; icon: string | null } | null;
  /** Show whose task this is (e.g. on shared views). */
  assignee?: { initial: string; firstName: string; tone?: number; pending?: boolean } | null;
  hideArea?: boolean;
}

export function TaskRow({ task, today, area, assignee, hideArea }: TaskRowProps) {
  const [done, setDone] = useState(task.status === "done");
  const [, startTransition] = useTransition();
  const toast = useToast();

  const overdue = !done && task.due_date != null && task.due_date < today;
  const daysLate = overdue ? daysBetween(task.due_date!, today) : 0;

  function complete() {
    if (done) return;
    setDone(true);
    navigator.vibrate?.(10);
    startTransition(async () => {
      const res = await completeTaskAction(task.id);
      if (!res.ok) {
        setDone(false);
        toast({ message: res.error });
        return;
      }
      const { nextId, nextDue } = res.data;
      toast({
        message: nextDue ? `Done. Next one: ${formatShortDate(nextDue)}` : `Done: ${task.title}`,
        actionLabel: "Undo",
        onAction: () => {
          setDone(false);
          startTransition(async () => {
            await reopenTaskAction(task.id, nextId);
          });
        },
      });
    });
  }

  return (
    <li className={cx("flex items-center gap-1 transition-opacity", done && "opacity-50")}>
      <button
        onClick={complete}
        aria-label={done ? "Completed" : `Mark “${task.title}” done`}
        className="-ml-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full active:bg-sage-soft"
      >
        <span
          className={cx(
            "flex h-7 w-7 items-center justify-center rounded-full border-2 transition",
            done ? "border-sage bg-sage text-white" : overdue ? "border-clay/70" : "border-muted/50",
          )}
        >
          {done && <CheckIcon className="h-4 w-4" />}
        </span>
      </button>
      <Link href={`/tasks/${task.id}`} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pr-1">
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate text-[1.03rem] leading-snug", done && "line-through")}>{task.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.85rem] text-muted">
            {task.due_date && (
              <span className={cx(overdue && "font-medium text-clay")}>
                {overdue && daysLate > 1 ? `${daysLate} days ago` : formatDue(task.due_date, task.due_time, today)}
              </span>
            )}
            {task.recurrence && <RepeatIcon className="h-3.5 w-3.5" />}
            {!hideArea && area && (
              <span className="truncate">
                {area.icon} {area.name}
              </span>
            )}
          </span>
        </span>
        {assignee && <Avatar initial={assignee.initial} pending={assignee.pending} tone={assignee.tone} />}
      </Link>
    </li>
  );
}
