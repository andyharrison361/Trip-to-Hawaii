import Link from "next/link";
import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { listOpenTasks } from "@/lib/core/tasks";
import { addDays, formatLongDate, formatRelativeDate } from "@/lib/dates";
import { TaskList } from "@/components/task-list";
import { EmptyState, PageHeader, PageSkeleton, SectionTitle, cx } from "@/components/ui";
import type { TaskRow } from "@/lib/types";

export const metadata = { title: "Calendar" };

const DAYS_AHEAD = 42;

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Agenda searchParams={searchParams} />
    </Suspense>
  );
}

async function Agenda({ searchParams }: { searchParams: PageProps<"/calendar">["searchParams"] }) {
  const { who } = await searchParams;
  const mineOnly = who === "mine";
  const { ctx, snap } = await requireHousehold();
  const { today } = snap;
  const tasks = await listOpenTasks(ctx, {
    assigneeId: mineOnly ? ctx.userId : undefined,
    dueOnOrBefore: addDays(today, DAYS_AHEAD),
  });

  const overdue = tasks.filter((t) => t.due_date! < today);
  const byDay = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    if (t.due_date! < today) continue;
    byDay.set(t.due_date!, [...(byDay.get(t.due_date!) ?? []), t]);
  }

  const tab = (active: boolean) =>
    cx("flex min-h-11 flex-1 items-center justify-center rounded-xl text-[0.95rem]", active ? "bg-card font-medium shadow-sm ring-1 ring-line" : "text-muted");

  return (
    <>
      <PageHeader title="Calendar" subtitle="The next six weeks for the household." />
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1 ring-1 ring-line">
        <Link href="/calendar" className={tab(!mineOnly)} replace>
          Everyone
        </Link>
        <Link href="/calendar?who=mine" className={tab(mineOnly)} replace>
          Just me
        </Link>
      </div>

      {overdue.length > 0 && (
        <>
          <SectionTitle>Catching up</SectionTitle>
          <TaskList tasks={overdue} snap={snap} showAssignee={mineOnly ? "never" : "always"} />
        </>
      )}

      {byDay.size === 0 && overdue.length === 0 && (
        <div className="mt-6">
          <EmptyState title="Nothing scheduled">Tasks with due dates will show up here.</EmptyState>
        </div>
      )}

      {[...byDay.entries()].map(([date, items]) => {
        const rel = formatRelativeDate(date, today);
        const label = rel === "Today" || rel === "Tomorrow" ? `${rel} · ${formatLongDate(date)}` : formatLongDate(date);
        return (
          <section key={date}>
            <SectionTitle>{label}</SectionTitle>
            <TaskList tasks={items} snap={snap} showAssignee={mineOnly ? "never" : "always"} />
          </section>
        );
      })}

      <p className="mt-8 px-1 text-center text-sm text-muted">
        Google Calendar events will show here too once calendars are connected.
      </p>
    </>
  );
}
