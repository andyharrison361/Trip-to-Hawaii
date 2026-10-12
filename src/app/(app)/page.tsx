import Link from "next/link";
import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { listOpenTasks } from "@/lib/core/tasks";
import { addDays, formatLongDate } from "@/lib/dates";
import { TaskList } from "@/components/task-list";
import { Avatar, EmptyState, PageSkeleton, SectionTitle } from "@/components/ui";
import { ChevronRightIcon } from "@/components/icons";

export default function TodayPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Today />
    </Suspense>
  );
}

function greeting(hour: number) {
  if (hour < 5) return "Hi";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function Today() {
  const { ctx, snap } = await requireHousehold();
  const { today } = snap;
  const weekAhead = addDays(today, 7);

  const [mine, anytime, household] = await Promise.all([
    listOpenTasks(ctx, { assigneeId: ctx.userId, dueOnOrBefore: weekAhead }),
    listOpenTasks(ctx, { assigneeId: ctx.userId, noDate: true, limit: 20 }),
    listOpenTasks(ctx, { dueOnOrBefore: weekAhead }),
  ]);

  const overdue = mine.filter((t) => t.due_date! < today);
  const dueToday = mine.filter((t) => t.due_date === today);
  const soon = mine.filter((t) => t.due_date! > today);
  const firstName = snap.members.find((m) => m.id === ctx.userId)?.firstName ?? "";

  // Household glance: per area, how much is coming up this week.
  const byArea = new Map<string, { due: number; behind: boolean }>();
  for (const t of household) {
    if (!t.area_id) continue;
    const entry = byArea.get(t.area_id) ?? { due: 0, behind: false };
    entry.due += 1;
    if (t.due_date! < today) entry.behind = true;
    byArea.set(t.area_id, entry);
  }

  return (
    <>
      <header className="pt-safe">
        <p className="pt-8 text-muted">{formatLongDate(today)}</p>
        <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight">
          {greeting(snap.now.hour)}
          {firstName && `, ${firstName}`}
        </h1>
      </header>

      {overdue.length > 0 && (
        <>
          <SectionTitle>Catching up</SectionTitle>
          <TaskList tasks={overdue} snap={snap} />
        </>
      )}

      <SectionTitle>Today</SectionTitle>
      {dueToday.length ? (
        <TaskList tasks={dueToday} snap={snap} />
      ) : (
        <EmptyState title={overdue.length ? "Nothing new today" : "You're all clear today"}>
          {overdue.length ? "Just the catch-up list above." : "Enjoy it. Tap + if something comes to mind."}
        </EmptyState>
      )}

      {soon.length > 0 && (
        <>
          <SectionTitle>Coming up this week</SectionTitle>
          <TaskList tasks={soon} snap={snap} />
        </>
      )}

      {anytime.length > 0 && (
        <>
          <SectionTitle>Anytime</SectionTitle>
          <TaskList tasks={anytime} snap={snap} />
        </>
      )}

      <SectionTitle
        aside={
          <Link href="/areas" className="text-sm font-medium text-sage-strong">
            All areas
          </Link>
        }
      >
        Our household
      </SectionTitle>
      {snap.areas.length === 0 ? (
        <EmptyState title="No areas yet">
          <Link href="/areas/new" className="font-medium text-sage-strong">
            Add your first area
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {snap.areas.map((a) => {
            const owner = a.owner_id ? snap.members.find((m) => m.id === a.owner_id) : snap.members.find((m) => m.pending);
            const stats = byArea.get(a.id);
            return (
              <li key={a.id}>
                <Link
                  href={`/areas/${a.id}`}
                  className="flex min-h-[4.5rem] items-center gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-line active:bg-sage-soft"
                >
                  <span className="text-xl">{a.icon ?? "•"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-[0.9rem] font-medium leading-tight">{a.name}</span>
                    <span className="block text-xs text-muted">
                      {stats ? `${stats.due} this week` : "Nothing this week"}
                      {stats?.behind && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-clay align-middle" />}
                    </span>
                  </span>
                  {owner && <Avatar initial={owner.initial} pending={owner.pending} tone={owner.tone} className="h-6 w-6 text-[0.65rem]" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/calendar"
        className="mt-4 flex min-h-12 items-center justify-between rounded-2xl px-4 text-sage-strong active:bg-sage-soft"
      >
        See everything coming up
        <ChevronRightIcon className="h-5 w-5" />
      </Link>
    </>
  );
}
