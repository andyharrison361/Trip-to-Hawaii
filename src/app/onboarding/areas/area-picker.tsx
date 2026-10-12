"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setupAreasAction } from "@/app/actions";
import { Button, ErrorText, SectionTitle, cx } from "@/components/ui";
import { CheckIcon } from "@/components/icons";

type Item = {
  key: string;
  name: string;
  icon: string;
  category: string;
  minimumStandard: string;
  suggested: boolean;
  suggestedOwner: "me" | "partner";
};

export function AreaPicker({
  me,
  partner,
  categories,
  catalog,
}: {
  me: { id: string; firstName: string };
  partner: { id: string | null; firstName: string };
  categories: { key: string; label: string }[];
  catalog: Item[];
}) {
  const [picked, setPicked] = useState<Record<string, "me" | "partner">>(() =>
    Object.fromEntries(catalog.filter((c) => c.suggested).map((c) => [c.key, c.suggestedOwner])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const count = (who: "me" | "partner") => Object.values(picked).filter((v) => v === who).length;

  function toggle(item: Item) {
    setPicked((p) => {
      const next = { ...p };
      if (next[item.key]) delete next[item.key];
      else next[item.key] = item.suggestedOwner;
      return next;
    });
  }

  return (
    <div className="mt-2">
      {categories.map((c) => {
        const items = catalog.filter((i) => i.category === c.key);
        return (
          <section key={c.key}>
            <SectionTitle>{c.label}</SectionTitle>
            <ul className="space-y-2">
              {items.map((item) => {
                const owner = picked[item.key];
                return (
                  <li key={item.key} className={cx("rounded-3xl ring-1 transition", owner ? "bg-card ring-sage/40" : "bg-card/60 ring-line")}>
                    <button type="button" onClick={() => toggle(item)} className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{item.name}</span>
                        {owner && <span className="line-clamp-2 block text-sm text-muted">{item.minimumStandard}</span>}
                      </span>
                      <span
                        className={cx(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                          owner ? "border-sage bg-sage text-white" : "border-muted/40",
                        )}
                      >
                        {owner && <CheckIcon className="h-4 w-4" />}
                      </span>
                    </button>
                    {owner && (
                      <div className="grid grid-cols-2 gap-1 px-3 pb-3">
                        {(["me", "partner"] as const).map((who) => (
                          <button
                            key={who}
                            type="button"
                            onClick={() => setPicked((p) => ({ ...p, [item.key]: who }))}
                            className={cx(
                              "min-h-11 rounded-xl text-[0.95rem]",
                              owner === who ? "bg-sage font-medium text-white" : "bg-canvas text-muted ring-1 ring-line",
                            )}
                          >
                            {who === "me" ? me.firstName : partner.firstName}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 px-5 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-xl pb-3">
          <ErrorText>{error}</ErrorText>
          <p className="mb-2 text-center text-sm text-muted">
            {me.firstName}: {count("me")} · {partner.firstName}: {count("partner")}
          </p>
          <Button
            className="w-full"
            disabled={pending || Object.keys(picked).length === 0}
            onClick={() =>
              startTransition(async () => {
                const res = await setupAreasAction(
                  Object.entries(picked).map(([key, who]) => ({ key, ownerId: who === "me" ? me.id : partner.id })),
                );
                if (!res.ok) return setError(res.error);
                router.push("/onboarding/tasks");
              })
            }
          >
            {pending ? "Saving…" : `Continue with ${Object.keys(picked).length} areas`}
          </Button>
        </div>
      </div>
    </div>
  );
}
