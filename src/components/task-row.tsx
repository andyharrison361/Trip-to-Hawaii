"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { completeTaskAction, reopenTaskAction } from "@/app/actions";
import { daysBetween, formatDue, formatShortDate, formatTime } from "@/lib/dates";
import type { TaskRow as Task } from "@/lib/types";
import { BroomIcon, CheckIcon, PinIcon, RepeatIcon } from "./icons";
import { useToast } from "./toast";
import { Avatar, KidChip, KidDot, cx, type KidTag } from "./ui";

export interface TaskRowProps {
  task: Pick<Task, "id" | "kind" | "title" | "due_date" | "due_time" | "end_time" | "location" | "recurrence" | "status">;
  today: string;
  /** The date this row stands for (a repeating item's occurrence). Defaults to the due date. */
  date?: string | null;
  area?: { name: string; icon: string | null } | null;
  /** Show whose item this is (e.g. on shared views). */
  assignee?: { initial: string; firstName: string; tone?: number; pending?: boolean } | null;
  kids?: KidTag[];
  hideArea?: boolean;
  /** On views grouped by day, the date is already in the heading. */
  hideDate?: boolean;
  /** A later date of a repeating to-do: shown for planning, not checkable yet. */
  projected?: boolean;
  variant?: "list" | "compact";
}

function useComplete(task: TaskRowProps["task"]) {
  const [done, setDone] = useState(task.status === "done");
  const [, startTransition] = useTransition();
  const toast = useToast();

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
  return { done, complete };
}

function eventTime(task: TaskRowProps["task"]) {
  if (!task.due_time) return "All day";
  return task.end_time ? `${formatTime(task.due_time)} – ${formatTime(task.end_time)}` : formatTime(task.due_time);
}

export function TaskRow(props: TaskRowProps) {
  return props.variant === "compact" ? <CompactRow {...props} /> : <ListRow {...props} />;
}

function Checkbox({
  done,
  overdue,
  projected,
  kind,
  title,
  onClick,
  size = "lg",
}: {
  done: boolean;
  overdue: boolean;
  projected?: boolean;
  kind: Task["kind"];
  title: string;
  onClick: () => void;
  size?: "lg" | "sm";
}) {
  const box = size === "lg" ? "h-7 w-7" : "h-[1.1rem] w-[1.1rem]";
  const shape = kind === "chore" ? "rounded-[30%]" : "rounded-full";
  const mark = (
    <span
      className={cx(
        "flex items-center justify-center border-2 transition",
        box,
        shape,
        done ? "border-accent bg-accent text-white" : overdue ? "border-clay/70" : "border-muted/50",
        projected && "border-dashed",
      )}
    >
      {done && <CheckIcon className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} />}
    </span>
  );
  if (projected) {
    return (
      <span className={cx("flex shrink-0 items-center justify-center", size === "lg" ? "-ml-1 h-14 w-14" : "h-6 w-6")} title="Upcoming">
        {mark}
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      aria-label={done ? "Completed" : `Mark “${title}” done`}
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full active:bg-accent-soft",
        size === "lg" ? "-ml-1 h-14 w-14" : "-m-1 h-8 w-8",
      )}
    >
      {mark}
    </button>
  );
}

function ListRow({ task, today, date, area, assignee, kids = [], hideArea, hideDate, projected }: TaskRowProps) {
  const { done, complete } = useComplete(task);
  const isEvent = task.kind === "event";
  const day = date ?? task.due_date;
  const overdue = !isEvent && !done && !projected && day != null && day < today;
  const daysLate = overdue ? daysBetween(day!, today) : 0;

  let when: string | null = null;
  if (!isEvent && day) {
    if (overdue && daysLate > 1) when = `${daysLate} days ago`;
    else if (hideDate) when = task.due_time ? formatTime(task.due_time) : null;
    else when = formatDue(day, task.due_time, today);
  } else if (isEvent && !hideDate && day) {
    when = formatDue(day, null, today);
  }

  return (
    <li className={cx("flex items-center gap-1 transition-opacity", (done || projected) && "opacity-55")}>
      {isEvent ? (
        <span className="-ml-1 flex min-h-14 w-14 shrink-0 flex-col items-center justify-center text-center leading-tight">
          <span className="font-display text-[0.95rem] font-semibold text-accent-strong">
            {task.due_time ? formatTime(task.due_time).replace(/ (AM|PM)$/, "") : "All"}
          </span>
          <span className="text-[0.7rem] uppercase tracking-wide text-muted">
            {task.due_time ? (formatTime(task.due_time).endsWith("PM") ? "pm" : "am") : "day"}
          </span>
        </span>
      ) : (
        <Checkbox done={done} overdue={overdue} projected={projected} kind={task.kind} title={task.title} onClick={complete} />
      )}
      <Link href={`/tasks/${task.id}`} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pr-1">
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate text-[1.03rem] leading-snug", done && "line-through")}>{task.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.85rem] text-muted">
            {when && <span className={cx(overdue && "font-medium text-clay")}>{when}</span>}
            {isEvent && task.end_time && <span>until {formatTime(task.end_time)}</span>}
            {isEvent && task.location && (
              <span className="inline-flex min-w-0 items-center gap-0.5">
                <PinIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{task.location}</span>
              </span>
            )}
            {task.kind === "chore" && <BroomIcon className="h-3.5 w-3.5" />}
            {task.recurrence && <RepeatIcon className="h-3.5 w-3.5" />}
            {projected && <span>upcoming</span>}
            {!hideArea && area && (
              <span className="truncate">
                {area.icon} {area.name}
              </span>
            )}
            {kids.map((k) => (
              <KidChip key={k.id} kid={k} />
            ))}
          </span>
        </span>
        {assignee && <Avatar initial={assignee.initial} pending={assignee.pending} tone={assignee.tone} />}
      </Link>
    </li>
  );
}

/** A dense row for the week grid on wide screens. */
function CompactRow({ task, today, date, assignee, kids = [], projected }: TaskRowProps) {
  const { done, complete } = useComplete(task);
  const isEvent = task.kind === "event";
  const day = date ?? task.due_date;
  const overdue = !isEvent && !done && !projected && day != null && day < today;
  return (
    <li className={cx("flex items-start gap-1.5 py-1", (done || projected) && "opacity-55")}>
      {isEvent ? (
        <span className="mt-[0.35rem] h-2 w-2 shrink-0 rounded-full bg-accent" />
      ) : (
        <Checkbox done={done} overdue={overdue} projected={projected} kind={task.kind} title={task.title} onClick={complete} size="sm" />
      )}
      <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1 text-[0.85rem] leading-snug active:opacity-70" title={task.title}>
        {isEvent && <span className="block text-[0.72rem] font-semibold text-accent-strong">{eventTime(task)}</span>}
        {!isEvent && task.due_time && <span className="mr-1 text-[0.72rem] text-muted">{formatTime(task.due_time)}</span>}
        <span className={cx("line-clamp-2", done && "line-through")}>{task.title}</span>
        {(kids.length > 0 || assignee) && (
          <span className="mt-0.5 flex items-center gap-1">
            {kids.map((k) => (
              <KidDot key={k.id} color={k.color} />
            ))}
            {assignee && <span className="text-[0.7rem] text-muted">{assignee.firstName}</span>}
          </span>
        )}
      </Link>
    </li>
  );
}
