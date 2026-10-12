"use client";

import { useState, useTransition } from "react";
import { addSuggestedTaskAction, createFromBundleAction, handOffAreaAction } from "@/app/actions";
import { Sheet } from "@/components/sheet";
import { useToast } from "@/components/toast";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { HandoffIcon, PlusIcon } from "@/components/icons";

export function HandOffButton({
  areaId,
  areaName,
  people,
}: {
  areaId: string;
  areaName: string;
  people: { id: string; firstName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(people[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const person = people.find((p) => p.id === to);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sage-strong active:bg-sage-soft"
      >
        <HandoffIcon className="h-5 w-5" /> Hand off
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Hand off ${areaName}`}>
        <div className="space-y-4">
          <p className="text-muted">
            The whole area moves, including noticing, planning and doing. Open tasks go with it. The hand-off shows up in your weekly review.
          </p>
          {people.length > 1 && (
            <Field label="To">
              <select value={to} onChange={(e) => setTo(e.target.value)} className={inputClass}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Note (optional)">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Swapping for a busy month"
              className={inputClass}
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button
            className="w-full"
            disabled={pending || !to}
            onClick={() =>
              startTransition(async () => {
                const res = await handOffAreaAction(areaId, to, note);
                if (!res.ok) return setError(res.error);
                setOpen(false);
                toast({ message: `${areaName} is now ${person?.firstName}'s` });
              })
            }
          >
            {pending ? "Handing off…" : `Hand off to ${person?.firstName ?? ""}`}
          </Button>
        </div>
      </Sheet>
    </>
  );
}

export function BundleButton({
  areaId,
  bundle,
}: {
  areaId: string;
  bundle: { key: string; label: string; nameLabel: string; namePlaceholder: string; dateLabel: string; count: number };
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-sage-soft px-4 font-medium text-sage-strong active:brightness-95"
      >
        <PlusIcon className="h-5 w-5" /> {bundle.label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={bundle.label}>
        <div className="space-y-4">
          <p className="text-muted">Creates {bundle.count} tasks, scheduled back from the date and sent to whoever owns each area.</p>
          <Field label={bundle.nameLabel}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={bundle.namePlaceholder} className={inputClass} />
          </Field>
          <Field label={bundle.dateLabel}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button
            className="w-full"
            disabled={pending || !date}
            onClick={() =>
              startTransition(async () => {
                const res = await createFromBundleAction({ areaId, bundleKey: bundle.key, name, date });
                if (!res.ok) return setError(res.error);
                setOpen(false);
                setName("");
                setDate("");
                toast({ message: `Added ${res.data} tasks` });
              })
            }
          >
            {pending ? "Creating…" : "Create checklist"}
          </Button>
        </div>
      </Sheet>
    </>
  );
}

export function SuggestionRow({ areaId, index, title, detail }: { areaId: string; index: number; title: string; detail: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <li className="flex min-h-14 items-center gap-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block">{title}</span>
        {detail && <span className="block text-sm text-muted">{detail}</span>}
      </span>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await addSuggestedTaskAction(areaId, index);
            toast({ message: res.ok ? `Added “${title}”` : res.error });
          })
        }
        className="inline-flex min-h-11 items-center gap-1 rounded-full bg-sage-soft px-3 text-sm font-medium text-sage-strong disabled:opacity-50"
      >
        <PlusIcon className="h-4 w-4" /> Add
      </button>
    </li>
  );
}
