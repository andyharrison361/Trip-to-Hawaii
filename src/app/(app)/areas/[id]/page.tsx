import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { listCompleted, listOpenTasks, suggestionsFor } from "@/lib/core/tasks";
import { defaultFirstDue } from "@/lib/core/areas";
import { bundlesFor } from "@/lib/catalog";
import { describeRecurrence } from "@/lib/recurrence";
import { formatRelativeDate, formatShortDate, nowInTimeZone } from "@/lib/dates";
import { TaskList } from "@/components/task-list";
import { Avatar, Card, EmptyState, PageHeader, PageSkeleton, SectionTitle } from "@/components/ui";
import { RepeatIcon } from "@/components/icons";
import { BundleButton, HandOffButton, SuggestionRow } from "./area-actions";

export default function AreaPage({ params }: PageProps<"/areas/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Area params={params} />
    </Suspense>
  );
}

async function Area({ params }: { params: PageProps<"/areas/[id]">["params"] }) {
  const { id } = await params;
  const { ctx, snap } = await requireHousehold();
  const area = snap.areas.find((a) => a.id === id);
  if (!area) notFound();

  const [open, done, handoffsRes] = await Promise.all([
    listOpenTasks(ctx, { areaId: id }),
    listCompleted(ctx, { areaId: id, limit: 8 }),
    ctx.db.from("area_handoffs").select("*").eq("area_id", id).order("created_at", { ascending: false }).limit(3),
  ]);

  const owner = area.owner_id ? snap.members.find((m) => m.id === area.owner_id) : snap.members.find((m) => m.pending);
  const others = snap.members.filter((m) => m.id && m.id !== area.owner_id);
  const dated = open.filter((t) => t.due_date);
  const anytime = open.filter((t) => !t.due_date);
  const repeating = open.filter((t) => t.recurrence);
  const suggestions = suggestionsFor(area, open.map((t) => t.title));
  const bundles = bundlesFor(area.template_key);
  const name = (uid: string | null) => snap.members.find((m) => m.id === uid)?.firstName ?? "Someone";

  return (
    <>
      <PageHeader
        back="/areas"
        title={
          <span className="flex items-center gap-3">
            <span>{area.icon ?? "•"}</span>
            {area.name}
          </span>
        }
        action={
          <Link href={`/areas/${id}/edit`} className="flex min-h-11 items-center rounded-full px-3 font-medium text-sage-strong active:bg-sage-soft">
            Edit
          </Link>
        }
      />

      <div className="mt-4 flex items-center gap-3">
        {owner && (
          <span className="inline-flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 ring-1 ring-line">
            <Avatar initial={owner.initial} pending={owner.pending} tone={owner.tone} />
            {owner.pending ? `${owner.firstName} (once they join)` : `${owner.id === ctx.userId ? "You own" : `${owner.firstName} owns`} this`}
          </span>
        )}
        {others.length > 0 && (
          <HandOffButton areaId={id} areaName={area.name} people={others.map((m) => ({ id: m.id!, firstName: m.firstName }))} />
        )}
      </div>

      <Card className="mt-4 bg-sun-soft/60">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-muted">Minimum standard</p>
        <p className="mt-1 whitespace-pre-line leading-relaxed">
          {area.minimum_standard || (
            <Link href={`/areas/${id}/edit`} className="text-sage-strong">
              Write down together what “done” means here.
            </Link>
          )}
        </p>
      </Card>

      {bundles.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {bundles.map((b) => (
            <BundleButton
              key={b.key}
              areaId={id}
              bundle={{ key: b.key, label: b.label, nameLabel: b.nameLabel, namePlaceholder: b.namePlaceholder, dateLabel: b.dateLabel, count: b.tasks.length }}
            />
          ))}
        </div>
      )}

      <SectionTitle>Up next</SectionTitle>
      {dated.length ? (
        <TaskList tasks={dated} snap={snap} hideArea showAssignee="others" />
      ) : (
        <EmptyState title="Nothing scheduled">Tap + to add something for this area.</EmptyState>
      )}

      {anytime.length > 0 && (
        <>
          <SectionTitle>Anytime</SectionTitle>
          <TaskList tasks={anytime} snap={snap} hideArea />
        </>
      )}

      {repeating.length > 0 && (
        <>
          <SectionTitle>Repeating</SectionTitle>
          <ul className="divide-y divide-line rounded-3xl bg-card px-4 ring-1 ring-line">
            {repeating.map((t) => (
              <li key={t.id}>
                <Link href={`/tasks/${t.id}`} className="flex min-h-14 items-center gap-3 py-2">
                  <RepeatIcon className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{t.title}</span>
                    <span className="block text-sm text-muted">{describeRecurrence(t.recurrence!, t.recurrence_mode)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {suggestions.length > 0 && (
        <details className="mt-7 rounded-3xl bg-card ring-1 ring-line">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-[0.95rem] text-muted">
            <span>Suggested tasks ({suggestions.length})</span>
            <span className="text-sage-strong">Show</span>
          </summary>
          <ul className="divide-y divide-line border-t border-line px-4">
            {suggestions.map((s) => {
              const first = defaultFirstDue(s, nowInTimeZone(ctx.timezone).date);
              return (
                <SuggestionRow
                  key={s.index}
                  areaId={id}
                  index={s.index}
                  title={s.title}
                  detail={[s.rule ? describeRecurrence(s.rule, s.mode) : null, first ? `first ${formatShortDate(first)}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                />
              );
            })}
          </ul>
        </details>
      )}

      {done.length > 0 && (
        <>
          <SectionTitle>Recently done</SectionTitle>
          <ul className="divide-y divide-line rounded-3xl bg-card px-4 ring-1 ring-line">
            {done.map((t) => (
              <li key={t.id} className="flex min-h-14 items-center gap-3 py-2">
                <span className="text-sage">✓</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{t.title}</span>
                  <span className="block text-sm text-muted">
                    {name(t.completed_by)} ·{" "}
                    {formatRelativeDate(nowInTimeZone(ctx.timezone, new Date(t.completed_at!)).date, snap.today)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {(handoffsRes.data ?? []).length > 0 && (
        <p className="mt-6 px-1 text-sm text-muted">
          {(handoffsRes.data ?? []).map((h) => (
            <span key={h.id} className="block">
              Handed from {name(h.from_user)} to {name(h.to_user)} on{" "}
              {formatShortDate(nowInTimeZone(ctx.timezone, new Date(h.created_at)).date)}
              {h.note ? `: “${h.note}”` : ""}
            </span>
          ))}
        </p>
      )}
    </>
  );
}
