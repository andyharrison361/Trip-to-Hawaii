"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createAreaAction, createAreaFromCatalogAction } from "@/app/actions";
import { Sheet } from "@/components/sheet";
import { Button, ErrorText, Field, SectionTitle, cx, inputClass } from "@/components/ui";
import { PlusIcon } from "@/components/icons";

type Person = { id: string | null; firstName: string; pending?: boolean };
type CatalogItem = { key: string; name: string; icon: string; category: string; minimumStandard: string; taskCount: number };

const PENDING = "__pending__";

function OwnerPicker({ people, value, onChange, currentUserId }: { people: Person[]; value: string; onChange: (v: string) => void; currentUserId: string }) {
  return (
    <div className="flex gap-2">
      {people.map((p) => {
        const v = p.id ?? PENDING;
        return (
          <button
            type="button"
            key={v}
            onClick={() => onChange(v)}
            className={cx(
              "min-h-12 flex-1 rounded-2xl px-3 font-medium ring-1",
              value === v ? "bg-sage text-white ring-sage" : "bg-canvas ring-line",
            )}
          >
            {p.id === currentUserId ? "Me" : p.firstName}
          </button>
        );
      })}
    </div>
  );
}

export function NewAreaForm({
  currentUserId,
  people,
  categories,
  catalog,
}: {
  currentUserId: string;
  people: Person[];
  categories: { key: string; label: string }[];
  catalog: CatalogItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<CatalogItem | null>(null);
  const [owner, setOwner] = useState(currentUserId);
  const [custom, setCustom] = useState({ name: "", icon: "", standard: "" });
  const [showCustom, setShowCustom] = useState(false);

  const ownerId = owner === PENDING ? null : owner;

  return (
    <div className="mt-4">
      <Button variant="secondary" className="w-full" onClick={() => setShowCustom(true)}>
        <PlusIcon className="h-5 w-5" /> Make your own area
      </Button>

      {categories.map((c) => {
        const items = catalog.filter((i) => i.category === c.key);
        if (!items.length) return null;
        return (
          <section key={c.key}>
            <SectionTitle>{c.label}</SectionTitle>
            <ul className="divide-y divide-line rounded-3xl bg-card ring-1 ring-line">
              {items.map((i) => (
                <li key={i.key}>
                  <button
                    onClick={() => {
                      setPicked(i);
                      setError(null);
                    }}
                    className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-sage-soft/60"
                  >
                    <span className="text-2xl">{i.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{i.name}</span>
                      <span className="line-clamp-2 block text-sm text-muted">{i.minimumStandard}</span>
                    </span>
                    <PlusIcon className="h-5 w-5 text-sage-strong" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <Sheet open={!!picked} onClose={() => setPicked(null)} title={picked ? `${picked.icon} ${picked.name}` : ""}>
        {picked && (
          <div className="space-y-4">
            <p className="text-muted">{picked.minimumStandard}</p>
            <Field label="Who owns it?">
              <OwnerPicker people={people} value={owner} onChange={setOwner} currentUserId={currentUserId} />
            </Field>
            {picked.taskCount > 0 && <p className="text-sm text-muted">Suggested tasks will be on the area page for you to add.</p>}
            <ErrorText>{error}</ErrorText>
            <Button
              className="w-full"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await createAreaFromCatalogAction(picked.key, ownerId);
                  if (!res.ok) return setError(res.error);
                  router.push(`/areas/${res.data}`);
                })
              }
            >
              {pending ? "Adding…" : "Add area"}
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={showCustom} onClose={() => setShowCustom(false)} title="New area">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await createAreaAction({
                name: custom.name,
                icon: custom.icon || null,
                minimumStandard: custom.standard,
                ownerId,
              });
              if (!res.ok) return setError(res.error);
              router.push(`/areas/${res.data}`);
            });
          }}
        >
          <div className="flex gap-3">
            <Field label="Icon">
              <input
                value={custom.icon}
                onChange={(e) => setCustom({ ...custom, icon: e.target.value })}
                placeholder="🌱"
                className={`${inputClass} w-20 text-center text-2xl`}
                maxLength={8}
              />
            </Field>
            <div className="flex-1">
              <Field label="Name">
                <input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} className={inputClass} required />
              </Field>
            </div>
          </div>
          <Field label="Who owns it?">
            <OwnerPicker people={people} value={owner} onChange={setOwner} currentUserId={currentUserId} />
          </Field>
          <Field label="Minimum standard" hint="What does “done” look like?">
            <textarea
              value={custom.standard}
              onChange={(e) => setCustom({ ...custom, standard: e.target.value })}
              rows={3}
              className={inputClass}
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Adding…" : "Add area"}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
