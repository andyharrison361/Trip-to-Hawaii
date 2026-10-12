"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setupStarterTasksAction } from "@/app/actions";
import { Button, ErrorText, SectionTitle, cx } from "@/components/ui";
import { CheckIcon, RepeatIcon } from "@/components/icons";

type Group = {
  areaId: string;
  name: string;
  icon: string;
  ownerName: string;
  tasks: { index: number; title: string; repeat: string | null; notes: string | null; defaultOn: boolean; firstDue: string | null }[];
};

export function StarterPicker({ groups }: { groups: Group[] }) {
  const key = (areaId: string, index: number) => `${areaId}:${index}`;
  const [on, setOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.flatMap((g) => g.tasks.map((t) => [key(g.areaId, t.index), t.defaultOn]))),
  );
  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.flatMap((g) => g.tasks.map((t) => [key(g.areaId, t.index), t.firstDue ?? ""]))),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const total = Object.values(on).filter(Boolean).length;

  return (
    <div className="mt-2">
      {groups.map((g) => (
        <section key={g.areaId}>
          <SectionTitle aside={<span className="text-sm text-muted">{g.ownerName}</span>}>
            {g.icon} {g.name}
          </SectionTitle>
          <ul className="divide-y divide-line rounded-3xl bg-card ring-1 ring-line">
            {g.tasks.map((t) => {
              const k = key(g.areaId, t.index);
              return (
                <li key={k} className={cx("flex items-start gap-1 py-2 pl-1 pr-3", !on[k] && "opacity-55")}>
                  <button
                    type="button"
                    onClick={() => setOn((s) => ({ ...s, [k]: !s[k] }))}
                    aria-label={on[k] ? `Skip ${t.title}` : `Keep ${t.title}`}
                    className="flex h-12 w-12 shrink-0 items-center justify-center"
                  >
                    <span
                      className={cx(
                        "flex h-7 w-7 items-center justify-center rounded-lg border-2",
                        on[k] ? "border-sage bg-sage text-white" : "border-muted/40",
                      )}
                    >
                      {on[k] && <CheckIcon className="h-4 w-4" />}
                    </span>
                  </button>
                  <div className="min-w-0 flex-1 py-2">
                    <p className="leading-snug">{t.title}</p>
                    {t.repeat && (
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                        <RepeatIcon className="h-3.5 w-3.5" /> {t.repeat}
                      </p>
                    )}
                    {t.notes && <p className="mt-0.5 text-sm text-muted">{t.notes}</p>}
                    {on[k] && (
                      <label className="mt-2 flex items-center gap-2 text-sm text-muted">
                        First due
                        <input
                          type="date"
                          value={dates[k]}
                          onChange={(e) => setDates((d) => ({ ...d, [k]: e.target.value }))}
                          className="min-h-10 rounded-xl bg-canvas px-2 text-ink ring-1 ring-line"
                        />
                      </label>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 px-5 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-xl pb-3">
          <ErrorText>{error}</ErrorText>
          <Button
            className="w-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const picks = groups.flatMap((g) =>
                  g.tasks
                    .filter((t) => on[key(g.areaId, t.index)])
                    .map((t) => ({ areaId: g.areaId, taskIndex: t.index, dueDate: dates[key(g.areaId, t.index)] || null })),
                );
                const res = await setupStarterTasksAction(picks);
                if (!res.ok) return setError(res.error);
                router.push("/onboarding/install");
              })
            }
          >
            {pending ? "Adding…" : total ? `Add ${total} tasks` : "Skip for now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
