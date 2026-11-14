import Link from "next/link";
import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { listPlannerRows } from "@/lib/core/tasks";
import { buildPlanner, filterPlanner, type PlannerFilter } from "@/lib/planner";
import { addDays, formatShortDate, isValidISODate, startOfWeek, toUTCDate } from "@/lib/dates";
import { kidColor } from "@/lib/colors";
import { TaskList } from "@/components/task-list";
import { PageSkeleton, cx } from "@/components/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

export const metadata = { title: "Week" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WeekPage({ searchParams }: PageProps<"/week">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Week searchParams={searchParams} />
    </Suspense>
  );
}

async function Week({ searchParams }: { searchParams: PageProps<"/week">["searchParams"] }) {
  const params = await searchParams;
  const { ctx, snap } = await requireHousehold();
  const { today } = snap;

  const requested = typeof params.start === "string" && isValidISODate(params.start) ? params.start : today;
  const from = startOfWeek(requested);
  const to = addDays(from, 6);
  const who = typeof params.who === "string" ? params.who : "all";

  const filter: PlannerFilter = {};
  if (who.startsWith("kid-")) filter.kidId = who.slice(4);
  else if (who !== "all") filter.memberId = who === "me" ? ctx.userId : who;

  const rows = await listPlannerRows(ctx, from, to);
  const days = filterPlanner(buildPlanner(rows, from, to), filter);
  const all = [...days.values()].flat();
  const events = all.filter((i) => i.task.kind === "event").length;
  const todos = all.filter((i) => i.task.kind !== "event" && !i.projected);
  const done = todos.filter((i) => i.task.status === "done").length;

  const href = (start: string, w = who) => {
    const q = new URLSearchParams();
    if (start !== startOfWeek(today)) q.set("start", start);
    if (w !== "all") q.set("who", w);
    const s = q.toString();
    return s ? `/week?${s}` : "/week";
  };
  const isThisWeek = from === startOfWeek(today);
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const range = sameMonth
    ? `${formatShortDate(from)} – ${toUTCDate(to).getUTCDate()}`
    : `${formatShortDate(from)} – ${formatShortDate(to)}`;

  const filters: { key: string; label: string; dot?: string }[] = [
    { key: "all", label: "Everyone" },
    { key: "me", label: "Me" },
    ...snap.members.filter((m) => m.id && m.id !== ctx.userId).map((m) => ({ key: m.id!, label: m.firstName })),
    ...snap.kids.map((k) => ({ key: `kid-${k.id}`, label: k.name, dot: kidColor(k.color).dot })),
  ];

  const navButton = "flex h-11 w-11 items-center justify-center rounded-full text-accent-strong ring-1 ring-line active:bg-accent-soft";

  return (
    <>
      <header className="pt-safe">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-8">
          <div>
            <p className="text-muted">{isThisWeek ? "This week" : `Week of ${formatShortDate(from)}`}</p>
            <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight">{range}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href={href(addDays(from, -7))} className={navButton} aria-label="Previous week" replace>
              <ChevronLeftIcon className="h-5 w-5" />
            </Link>
            {!isThisWeek && (
              <Link href={href(startOfWeek(today))} className="flex h-11 items-center rounded-full px-4 text-sm font-medium text-accent-strong ring-1 ring-line active:bg-accent-soft" replace>
                Today
              </Link>
            )}
            <Link href={href(addDays(from, 7))} className={navButton} aria-label="Next week" replace>
              <ChevronRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
        <p className="mt-1 text-muted">
          {events} {events === 1 ? "event" : "events"} · {todos.length} to-dos{todos.length > 0 && `, ${done} done`}
        </p>
      </header>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={href(from, f.key)}
            replace
            className={cx(
              "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[0.95rem] ring-1",
              who === f.key ? "bg-ink text-canvas ring-ink" : "bg-card text-ink ring-line active:bg-accent-soft",
            )}
          >
            {f.dot && <span className={cx("h-2.5 w-2.5 rounded-full", f.dot)} />}
            {f.label}
          </Link>
        ))}
      </div>

      {/* Phones: one day after another */}
      <div className="mt-5 space-y-5 lg:hidden">
        {[...days].map(([date, items]) => {
          const d = toUTCDate(date);
          const isToday = date === today;
          return (
            <section key={date}>
              <h2 className="mb-1.5 flex items-baseline gap-2 px-1">
                <span className={cx("font-display text-2xl font-semibold", isToday && "highlight")}>{d.getUTCDate()}</span>
                <span className="font-medium">{WEEKDAYS_LONG[d.getUTCDay()]}</span>
                {isToday && <span className="text-sm text-accent-strong">Today</span>}
              </h2>
              {items.length ? (
                <TaskList items={items} snap={snap} showAssignee="always" hideDate />
              ) : (
                <p className="rounded-3xl border border-dashed border-line px-4 py-3 font-hand text-lg text-muted">Free</p>
              )}
            </section>
          );
        })}
      </div>

      {/* Computers: a week-at-a-glance spread */}
      <div className="mt-6 hidden grid-cols-7 gap-2 lg:grid">
        {[...days].map(([date, items]) => {
          const d = toUTCDate(date);
          const isToday = date === today;
          const past = date < today;
          return (
            <section
              key={date}
              className={cx(
                "flex min-h-[26rem] flex-col rounded-2xl bg-card px-2.5 pb-2 pt-2.5 ring-1",
                isToday ? "ring-2 ring-accent/50" : "ring-line",
                past && "bg-card/60",
              )}
            >
              <h2 className="mb-1 flex items-baseline justify-between border-b border-line pb-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{WEEKDAYS[d.getUTCDay()]}</span>
                <span className={cx("font-display text-xl font-semibold", isToday && "highlight")}>{d.getUTCDate()}</span>
              </h2>
              {items.length ? (
                <TaskList items={items} snap={snap} showAssignee="always" hideDate variant="compact" />
              ) : (
                <p className="pt-2 font-hand text-base text-muted/70">Free</p>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-6 px-1 text-center text-sm text-muted">
        Faded items with a dashed box are upcoming repeats. They become checkable when their turn comes.
      </p>
    </>
  );
}
