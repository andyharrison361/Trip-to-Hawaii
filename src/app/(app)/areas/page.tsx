import Link from "next/link";
import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { CATEGORIES } from "@/lib/catalog";
import { Avatar, PageHeader, PageSkeleton, SectionTitle, buttonClass } from "@/components/ui";
import { ChevronRightIcon, PlusIcon } from "@/components/icons";
import type { AreaRow } from "@/lib/types";

export const metadata = { title: "Areas" };

export default function AreasPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Areas />
    </Suspense>
  );
}

async function Areas() {
  const { snap } = await requireHousehold();
  const groups = new Map<string, AreaRow[]>();
  for (const a of snap.areas) {
    const key = a.category ?? "other";
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const ordered = [
    ...CATEGORIES.filter((c) => groups.has(c.key)),
    ...(groups.has("other") ? [{ key: "other", label: "Other" }] : []),
  ];
  const real = snap.members.filter((m) => !m.pending);

  return (
    <>
      <PageHeader
        title="Areas"
        subtitle="Owning an area means noticing, planning and doing, from start to finish."
        action={
          <Link href="/areas/new" className={buttonClass("ghost", "min-h-11 px-3")}>
            <PlusIcon className="h-5 w-5" /> Add
          </Link>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {snap.members.map((m) => {
          const count = snap.areas.filter((a) => (m.pending ? a.owner_id === null : a.owner_id === m.id)).length;
          return (
            <span key={m.id ?? "pending"} className="inline-flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 text-sm ring-1 ring-line">
              <Avatar initial={m.initial} pending={m.pending} tone={m.tone} />
              {m.firstName}
              {m.pending && " (invited)"} · {count} {count === 1 ? "area" : "areas"}
            </span>
          );
        })}
      </div>

      {ordered.map((cat) => (
        <section key={cat.key}>
          <SectionTitle>{cat.label}</SectionTitle>
          <ul className="divide-y divide-line rounded-3xl bg-card ring-1 ring-line">
            {groups.get(cat.key)!.map((a) => {
              const owner = a.owner_id ? real.find((m) => m.id === a.owner_id) : snap.members.find((m) => m.pending);
              return (
                <li key={a.id}>
                  <Link href={`/areas/${a.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2 active:bg-sage-soft/60">
                    <span className="text-2xl">{a.icon ?? "•"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.name}</span>
                      <span className="block truncate text-sm text-muted">{a.minimum_standard || "No minimum standard yet"}</span>
                    </span>
                    {owner && <Avatar initial={owner.initial} pending={owner.pending} tone={owner.tone} />}
                    <ChevronRightIcon className="h-5 w-5 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
