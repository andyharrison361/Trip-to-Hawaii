"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseQuickAdd } from "@/lib/quick-add";
import { describeRecurrence, type Recurrence } from "@/lib/recurrence";
import { formatDue, formatTime, nowInTimeZone } from "@/lib/dates";
import { createTaskAction } from "@/app/actions";
import { OPEN_QUICK_ADD } from "./bottom-nav";
import { useToast } from "./toast";
import { RepeatIcon, XIcon } from "./icons";
import { cx } from "./ui";

export interface QuickAddProps {
  areas: { id: string; name: string; icon: string | null; ownerId: string | null; keywords: string[] }[];
  members: { id: string | null; firstName: string; pending?: boolean }[];
  currentUserId: string;
  timezone: string;
}

type Overrides = {
  areaId?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  recurrence?: Recurrence | null;
};

const PENDING = "__pending__";

export function QuickAdd({ areas, members, currentUserId, timezone }: QuickAddProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [overrides, setOverrides] = useState<Overrides>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    const onOpen = () => {
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener(OPEN_QUICK_ADD, onOpen);
    return () => window.removeEventListener(OPEN_QUICK_ADD, onOpen);
  }, []);

  const realMembers = members.filter((m) => m.id);
  const now = nowInTimeZone(timezone);

  const draft = useMemo(
    () =>
      parseQuickAdd(text, {
        currentUserId,
        now: nowInTimeZone(timezone),
        members: realMembers.map((m) => ({ id: m.id!, name: m.firstName })),
        areas,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, areas, currentUserId, timezone],
  );

  const value = {
    areaId: "areaId" in overrides ? overrides.areaId! : draft.areaId,
    dueDate: "dueDate" in overrides ? overrides.dueDate! : draft.dueDate,
    dueTime: "dueTime" in overrides ? overrides.dueTime! : draft.dueTime,
    recurrence: "recurrence" in overrides ? overrides.recurrence! : draft.recurrence,
    assigneeId: "assigneeId" in overrides ? overrides.assigneeId! : draft.assigneeId,
  };
  // Changing the area changes the default assignee, unless someone was picked explicitly.
  if (!("assigneeId" in overrides) && "areaId" in overrides && draft.assigneeMatchedBy !== "mention") {
    const area = areas.find((a) => a.id === value.areaId);
    value.assigneeId = area ? area.ownerId : currentUserId;
  }

  function close() {
    setOpen(false);
    inputRef.current?.blur();
  }

  function reset() {
    setText("");
    setOverrides({});
    setError(null);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!draft.title.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createTaskAction({
        title: draft.title,
        areaId: value.areaId,
        assigneeId: value.assigneeId,
        dueDate: value.dueDate,
        dueTime: value.dueTime,
        recurrence: value.recurrence?.rule ?? null,
        recurrenceMode: value.recurrence?.mode ?? "fixed",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const due = res.data.due_date ? ` · ${formatDue(res.data.due_date, res.data.due_time, now.date)}` : "";
      toast({
        message: `Added “${res.data.title}”${due}`,
        actionLabel: "Edit",
        onAction: () => router.push(`/tasks/${res.data.id}`),
      });
      reset();
      close();
    });
  }

  const chip =
    "inline-flex min-h-10 items-center gap-1.5 rounded-full bg-canvas px-3 text-[0.95rem] ring-1 ring-line";
  const chipActive = "bg-sage-soft text-sage-strong ring-sage/30";

  return (
    <div
      className={cx("fixed inset-0 z-50", open ? "" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        className={cx("absolute inset-0 bg-ink/25 transition-opacity", open ? "opacity-100" : "opacity-0")}
        onClick={close}
      />
      <form
        onSubmit={submit}
        className={cx(
          "pb-safe absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-card px-4 pt-3 shadow-2xl transition-transform duration-200",
          // Kept mounted (just moved off-screen) so the input can take focus within the tap.
          open ? "translate-y-0 opacity-100" : "translate-y-[110%] opacity-0",
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pay water bill Friday #finances"
            enterKeyHint="done"
            autoComplete="off"
            autoCapitalize="sentences"
            className="min-h-14 flex-1 rounded-2xl bg-canvas px-4 text-[1.1rem] ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-sage"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-12 w-12 items-center justify-center rounded-full text-muted active:bg-canvas"
          >
            <XIcon />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {/* Date */}
          <label className={cx(chip, "relative", value.dueDate && chipActive)}>
            <span>📅 {value.dueDate ? formatDue(value.dueDate, null, now.date) : "No date"}</span>
            <input
              type="date"
              value={value.dueDate ?? ""}
              onChange={(e) => setOverrides((o) => ({ ...o, dueDate: e.target.value || null }))}
              className="absolute inset-0 opacity-0"
              aria-label="Due date"
            />
          </label>
          {/* Time */}
          {(value.dueDate || value.dueTime) && (
            <label className={cx(chip, "relative", value.dueTime && chipActive)}>
              <span>⏰ {value.dueTime ? formatTime(value.dueTime) : "Any time"}</span>
              <input
                type="time"
                value={value.dueTime ?? ""}
                onChange={(e) => setOverrides((o) => ({ ...o, dueTime: e.target.value || null }))}
                className="absolute inset-0 opacity-0"
                aria-label="Due time"
              />
            </label>
          )}
          {/* Area */}
          <label className={cx(chip, "relative", value.areaId && chipActive)}>
            <span>
              {(() => {
                const a = areas.find((x) => x.id === value.areaId);
                return a ? `${a.icon ?? "•"} ${a.name}` : "No area";
              })()}
            </span>
            <select
              value={value.areaId ?? ""}
              onChange={(e) => setOverrides((o) => ({ ...o, areaId: e.target.value || null }))}
              className="absolute inset-0 opacity-0"
              aria-label="Area"
            >
              <option value="">No area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name}
                </option>
              ))}
            </select>
          </label>
          {/* Who */}
          <label className={cx(chip, "relative")}>
            <span>
              👤{" "}
              {value.assigneeId
                ? value.assigneeId === currentUserId
                  ? "Me"
                  : (realMembers.find((m) => m.id === value.assigneeId)?.firstName ?? "Someone")
                : (members.find((m) => m.pending)?.firstName ?? "Partner")}
            </span>
            <select
              value={value.assigneeId ?? PENDING}
              onChange={(e) =>
                setOverrides((o) => ({ ...o, assigneeId: e.target.value === PENDING ? null : e.target.value }))
              }
              className="absolute inset-0 opacity-0"
              aria-label="Who"
            >
              {members.map((m) => (
                <option key={m.id ?? PENDING} value={m.id ?? PENDING}>
                  {m.id === currentUserId ? "Me" : m.pending ? `${m.firstName} (invited)` : m.firstName}
                </option>
              ))}
            </select>
          </label>
          {/* Repeat */}
          {value.recurrence && (
            <button
              type="button"
              className={cx(chip, chipActive)}
              onClick={() => setOverrides((o) => ({ ...o, recurrence: null }))}
              aria-label="Remove repeat"
            >
              <RepeatIcon className="h-4 w-4" />
              {describeRecurrence(value.recurrence.rule, value.recurrence.mode)}
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-clay">{error}</p>}

        <div className="mt-4 flex items-center justify-between gap-3 pb-4">
          <p className="text-sm leading-snug text-muted">
            Try “every month on the 20th”, “#car”, “@{realMembers.find((m) => m.id !== currentUserId)?.firstName.toLowerCase() ?? "name"}”
          </p>
          <button
            type="submit"
            disabled={pending || !draft.title.trim()}
            className="min-h-12 shrink-0 rounded-2xl bg-sage px-6 font-semibold text-white active:bg-sage-strong disabled:opacity-40"
          >
            {pending ? "Adding…" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
