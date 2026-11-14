import Link from "next/link";
import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { listOpenTasks, listPlannerRows } from "@/lib/core/tasks";
import { buildPlanner, overdueItems, type PlannerItem } from "@/lib/planner";
import { addDays, formatShortDate, toUTCDate } from "@/lib/dates";
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

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

async function Today() {
  const { ctx, snap } = await requireHousehold();
  const { today } = snap;
  const weekEnd = addDays(today, 6);

  const [rows, lateRows, anytime] = await Promise.all([
    listPlannerRows(ctx, today, weekEnd),
    listOpenTasks(ctx, { dueOnOrBefore: addDays(today, -1) }),
    listOpenTasks(ctx, { assigneeId: ctx.userId, noDate: true, limit: 20 }),
  ]);
  const days = buildPlanner(rows, today, weekEnd);
  const todays = days.get(today) ?? [];
  const overdue = overdueItems(lateRows, today);

  const me = snap.members.find((m) => m.id === ctx.userId);
  const partner = snap.members.find((m) => m.id !== ctx.userId);
  const schedule = todays.filter((i) => i.task.kind === "event");
  const todos = todays.filter((i) => i.task.kind !== "event");
  const isMine = (i: PlannerItem) => i.task.assignee_id === ctx.userId;
  const myToday = todos.filter(isMine);
  const theirToday = todos.filter((i) => !isMine(i));
  const myLate = overdue.filter((t) => t.assignee_id === ctx.userId);
  const theirLate = overdue.filter((t) => t.assignee_id !== ctx.userId);
  const openCount = (items: PlannerItem[]) => items.filter((i) => i.task.status === "open").length;

  const d = toUTCDate(today);
  const partnerName = partner?.firstName ?? "Partner";

  // Household glance: per area, how much is coming up this week.
  const byArea = new Map<string, { due: number; behind: boolean }>();
  for (const item of [...days.values()].flat()) {
    if (!item.task.area_id || item.task.status !== "open") continue;
    const entry = byArea.get(item.task.area_id) ?? { due: 0, behind: false };
    entry.due += 1;
    byArea.set(item.task.area_id, entry);
  }
  for (const t of overdue) {
    if (!t.area_id) continue;
    const entry = byArea.get(t.area_id) ?? { due: 0, behind: false };
    entry.behind = true;
    byArea.set(t.area_id, entry);
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
      <div>
        <header className="pt-safe">
          <p className="pt-8 text-muted">
            {greeting(snap.now.hour)}
            {me && `, ${me.firstName}`}
          </p>
          <h1 className="font-display text-[2.3rem] font-semibold leading-tight tracking-tight">
            {WEEKDAYS[d.getUTCDay()]}, <span className="highlight">{MONTHS[d.getUTCMonth()]} {d.getUTCDate()}</span>
          </h1>
          <p className="mt-1 text-muted">
            {schedule.length === 0 ? "Nothing on the calendar" : `${schedule.length} on the calendar`} ·{" "}
            {openCount(myToday) + myLate.length} for you · {openCount(theirToday) + theirLate.length} for {partnerName}
          </p>
        </header>

        <SectionTitle>Today&apos;s schedule</SectionTitle>
        {schedule.length ? (
          <TaskList items={schedule} snap={snap} showAssignee="always" hideDate />
        ) : (
          <EmptyState title="A clear calendar today">Practices, appointments and visits show up here.</EmptyState>
        )}

        <SectionTitle>On your plate</SectionTitle>
        {myLate.length > 0 && (
          <div className="mb-2">
            <p className="mb-1.5 px-1 text-sm font-medium text-clay">Carried over</p>
            <TaskList tasks={myLate} snap={snap} />
          </div>
        )}
        {myToday.length ? (
          <TaskList items={myToday} snap={snap} hideDate />
        ) : (
          !myLate.length && <EmptyState title="Nothing for you today">Enjoy it. Tap + if something comes to mind.</EmptyState>
        )}

        <SectionTitle>
          On {partnerName}&apos;s plate{partner?.pending && <span className="normal-case tracking-normal"> (invited)</span>}
        </SectionTitle>
        {theirLate.length + theirToday.length === 0 ? (
          <EmptyState title={`Nothing for ${partnerName} today`} />
        ) : (
          <div className="space-y-2">
            {theirLate.length > 0 && <TaskList tasks={theirLate} snap={snap} showAssignee="never" />}
            {theirToday.length > 0 && <TaskList items={theirToday} snap={snap} showAssignee="never" hideDate />}
          </div>
        )}

        {anytime.length > 0 && (
          <>
            <SectionTitle>Anytime</SectionTitle>
            <TaskList tasks={anytime} snap={snap} />
          </>
        )}
      </div>

      <aside className="lg:pt-24">
        <SectionTitle
          aside={
            <Link href="/week" className="text-sm font-medium text-accent-strong">
              Week view
            </Link>
          }
        >
          Rest of the week
        </SectionTitle>
        <div className="space-y-4">
          {[...days].slice(1).map(([date, items]) => {
            const day = toUTCDate(date);
            return (
              <section key={date}>
                <h3 className="mb-1.5 flex items-baseline gap-2 px-1">
                  <span className="font-display text-lg font-semibold">{WEEKDAYS[day.getUTCDay()]}</span>
                  <span className="text-sm text-muted">{formatShortDate(date)}</span>
                </h3>
                {items.length ? (
                  <TaskList items={items} snap={snap} showAssignee="always" hideDate hideArea />
                ) : (
                  <p className="px-1 font-hand text-lg text-muted">Nothing planned yet</p>
                )}
              </section>
            );
          })}
        </div>

        <SectionTitle
          aside={
            <Link href="/areas" className="text-sm font-medium text-accent-strong">
              All areas
            </Link>
          }
        >
          Who owns what
        </SectionTitle>
        {snap.areas.length === 0 ? (
          <EmptyState title="No areas yet">
            <Link href="/areas/new" className="font-medium text-accent-strong">
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
                    className="flex min-h-[4.5rem] items-center gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-line active:bg-accent-soft"
                  >
                    <span className="text-xl">{a.icon ?? "•"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[0.9rem] font-medium leading-tight">{a.name}</span>
                      <span className="block text-xs text-muted">
                        {stats?.due ? `${stats.due} this week` : "Nothing this week"}
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
          href="/week"
          className="mt-4 flex min-h-12 items-center justify-between rounded-2xl px-4 text-accent-strong active:bg-accent-soft lg:hidden"
        >
          Open the week view
          <ChevronRightIcon className="h-5 w-5" />
        </Link>
      </aside>
    </div>
  );
}
