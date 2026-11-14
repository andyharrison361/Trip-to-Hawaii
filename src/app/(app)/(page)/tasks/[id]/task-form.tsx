"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeTaskAction, deleteTaskAction, reopenTaskAction, updateTaskAction } from "@/app/actions";
import { describeRecurrence, parseRecurrence, upcomingOccurrences, type RecurrenceMode } from "@/lib/recurrence";
import { formatShortDate, toUTCDate } from "@/lib/dates";
import { kidColor } from "@/lib/colors";
import type { ItemKind, TaskRow } from "@/lib/types";
import { useToast } from "@/components/toast";
import { Button, ErrorText, Field, cx, inputClass, type KidTag } from "@/components/ui";

const KIND_LABELS: Record<ItemKind, { label: string; hint: string }> = {
  event: { label: "Event", hint: "Happens at a time: practices, appointments, visits." },
  task: { label: "Task", hint: "A to-do to check off, like paying a bill." },
  chore: { label: "Chore", hint: "A household routine, like trash night or laundry." },
};

type Person = { id: string | null; firstName: string; pending?: boolean };
const PENDING = "__pending__";
const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function presets(dueDate: string | null) {
  const d = dueDate ? toUTCDate(dueDate) : null;
  const day = d ? DAY_CODES[d.getUTCDay()] : null;
  const dom = d ? d.getUTCDate() : null;
  return [
    { label: "Doesn't repeat", rule: "" },
    { label: "Every day", rule: "FREQ=DAILY" },
    { label: "Every week", rule: day ? `FREQ=WEEKLY;BYDAY=${day}` : "FREQ=WEEKLY" },
    { label: "Every 2 weeks", rule: day ? `FREQ=WEEKLY;INTERVAL=2;BYDAY=${day}` : "FREQ=WEEKLY;INTERVAL=2" },
    { label: "Every month", rule: dom ? `FREQ=MONTHLY;BYMONTHDAY=${dom}` : "FREQ=MONTHLY" },
    { label: "Every 3 months", rule: "FREQ=MONTHLY;INTERVAL=3" },
    { label: "Every 6 months", rule: "FREQ=MONTHLY;INTERVAL=6" },
    { label: "Every year", rule: "FREQ=YEARLY" },
  ];
}

export function TaskForm({
  task,
  today,
  currentUserId,
  areas,
  people,
  kids,
}: {
  task: TaskRow;
  today: string;
  currentUserId: string;
  areas: { id: string; name: string; icon: string | null; ownerId: string | null }[];
  people: Person[];
  kids: KidTag[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<ItemKind>(task.kind);
  const [title, setTitle] = useState(task.title);
  const [endTime, setEndTime] = useState(task.end_time?.slice(0, 5) ?? "");
  const [location, setLocation] = useState(task.location);
  const [kidIds, setKidIds] = useState<string[]>(task.kid_ids);
  const [areaId, setAreaId] = useState(task.area_id ?? "");
  const [assignee, setAssignee] = useState(task.assignee_id ?? PENDING);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [dueTime, setDueTime] = useState(task.due_time?.slice(0, 5) ?? "");
  const [rule, setRule] = useState(task.recurrence ?? "");
  const [mode, setMode] = useState<RecurrenceMode>(task.recurrence_mode);
  const [customText, setCustomText] = useState("");
  const [notes, setNotes] = useState(task.notes);

  // Opened from a link (e.g. a notification) there may be no in-app history to go back to.
  const leave = () => (window.history.length > 1 ? router.back() : router.push("/"));

  const options = presets(dueDate || null);
  const presetMatch = options.find((o) => o.rule === rule);
  const [custom, setCustom] = useState(!presetMatch);
  const preview = rule ? upcomingOccurrences(rule, dueDate || today, 3) : [];

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateTaskAction(task.id, {
        kind,
        title,
        notes,
        location: kind === "event" ? location : "",
        kidIds,
        endTime: kind === "event" ? endTime || null : null,
        areaId: areaId || null,
        assigneeId: assignee === PENDING ? null : assignee,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        recurrence: rule || null,
        recurrenceMode: kind === "event" ? "fixed" : mode,
        remindDaysBefore: task.remind_days_before,
        reminderTime: task.reminder_time,
      });
      if (!res.ok) return setError(res.error);
      toast({ message: "Saved" });
      leave();
    });
  }

  return (
    <form onSubmit={save} className="mt-5 space-y-5">
      <div>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-canvas p-1 ring-1 ring-line" role="radiogroup" aria-label="Kind">
          {(Object.keys(KIND_LABELS) as ItemKind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cx("min-h-11 rounded-xl text-[0.95rem]", kind === k ? "bg-card font-medium shadow-sm ring-1 ring-line" : "text-muted")}
            >
              {KIND_LABELS[k].label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 px-1 text-sm text-muted">{KIND_LABELS[kind].hint}</p>
      </div>

      <Field label="What">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
      </Field>

      {kids.length > 0 && (
        <div>
          <span className="mb-1.5 block px-1 text-sm font-medium text-muted">For</span>
          <div className="flex flex-wrap gap-2">
            {kids.map((k) => {
              const on = kidIds.includes(k.id);
              return (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setKidIds((ids) => (on ? ids.filter((id) => id !== k.id) : [...ids, k.id]))}
                  className={cx(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[0.95rem] ring-1",
                    on ? cx(kidColor(k.color).soft, "ring-transparent font-medium") : "bg-canvas ring-line text-muted",
                  )}
                >
                  <span className={cx("h-2.5 w-2.5 rounded-full", kidColor(k.color).dot)} />
                  {k.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Area">
          <select
            value={areaId}
            onChange={(e) => {
              setAreaId(e.target.value);
              const owner = areas.find((a) => a.id === e.target.value)?.ownerId;
              if (owner !== undefined) setAssignee(owner ?? PENDING);
            }}
            className={inputClass}
          >
            <option value="">No area</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={kind === "event" ? "Who's handling it" : "Who"}>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputClass}>
            {people.map((p) => (
              <option key={p.id ?? PENDING} value={p.id ?? PENDING}>
                {p.id === currentUserId ? "Me" : p.pending ? `${p.firstName} (invited)` : p.firstName}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={kind === "event" ? "Date" : "Due"}>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
            required={kind === "event"}
          />
        </Field>
        <Field label={kind === "event" ? "Starts (optional)" : "Time (optional)"}>
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={inputClass} />
        </Field>
      </div>

      {kind === "event" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ends (optional)">
            <input
              type="time"
              value={endTime}
              min={dueTime || undefined}
              disabled={!dueTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={cx(inputClass, !dueTime && "opacity-50")}
            />
          </Field>
          <Field label="Where (optional)">
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Riverside Park" className={inputClass} />
          </Field>
        </div>
      )}

      <Field label="Repeats">
        <select
          value={custom ? "__custom__" : rule}
          onChange={(e) => {
            if (e.target.value === "__custom__") {
              setCustom(true);
              return;
            }
            setCustom(false);
            setRule(e.target.value);
          }}
          className={inputClass}
        >
          {options.map((o) => (
            <option key={o.label} value={o.rule}>
              {o.label}
            </option>
          ))}
          <option value="__custom__">Custom…</option>
        </select>
      </Field>

      {custom && (
        <Field label="Describe it" hint={rule ? describeRecurrence(rule, mode) : "e.g. “every other Friday”, “monthly on the 15th”, “quarterly”"}>
          <input
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              const parsed = parseRecurrence(e.target.value);
              if (parsed) {
                setRule(parsed.recurrence.rule);
                if (parsed.recurrence.mode === "after_completion") setMode("after_completion");
              }
            }}
            placeholder={rule ? describeRecurrence(rule) : "every month on the 20th"}
            className={inputClass}
          />
        </Field>
      )}

      {rule && kind === "event" && (
        <p className="px-1 text-sm text-muted">Shows on the planner every time: {preview.map(formatShortDate).join(", ")}…</p>
      )}

      {rule && kind !== "event" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1 ring-1 ring-line">
            {(
              [
                ["fixed", "On a schedule"],
                ["after_completion", "From when it's done"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cx("min-h-11 rounded-xl text-[0.95rem]", mode === value ? "bg-card font-medium shadow-sm ring-1 ring-line" : "text-muted")}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="px-1 text-sm text-muted">
            {mode === "fixed"
              ? `Next dates: ${preview.map(formatShortDate).join(", ")}`
              : "The next one is scheduled from the day you mark this done. Good for oil changes, filters and haircuts."}
          </p>
        </div>
      )}

      <Field label="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </Field>

      <ErrorText>{error}</ErrorText>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>

      <div className="flex gap-2">
        {task.kind === "event" ? null : task.status === "open" ? (
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await completeTaskAction(task.id);
                if (!res.ok) return setError(res.error);
                toast({ message: res.data.nextDue ? `Done. Next one: ${formatShortDate(res.data.nextDue)}` : "Done" });
                leave();
              })
            }
          >
            Mark done
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await reopenTaskAction(task.id, null);
                if (!res.ok) return setError(res.error);
                router.refresh();
              })
            }
          >
            Reopen
          </Button>
        )}
        <Button
          type="button"
          variant="danger"
          className="flex-1"
          disabled={pending}
          onClick={() => {
            const noun = KIND_LABELS[task.kind].label.toLowerCase();
            const message =
              task.kind === "event" && task.recurrence
                ? "Delete this event? Every date in the series goes with it."
                : task.recurrence
                  ? `Delete this ${noun}? It won't repeat anymore.`
                  : `Delete this ${noun}?`;
            if (!confirm(message)) return;
            startTransition(async () => {
              const res = await deleteTaskAction(task.id);
              if (!res.ok) return setError(res.error);
              toast({ message: "Deleted" });
              leave();
            });
          }}
        >
          Delete
        </Button>
      </div>
    </form>
  );
}
