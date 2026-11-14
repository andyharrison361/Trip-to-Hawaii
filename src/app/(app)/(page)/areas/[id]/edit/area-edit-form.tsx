"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAreaAction, updateAreaAction } from "@/app/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

export function AreaEditForm({ area }: { area: { id: string; name: string; icon: string; minimumStandard: string } }) {
  const [name, setName] = useState(area.name);
  const [icon, setIcon] = useState(area.icon);
  const [standard, setStandard] = useState(area.minimumStandard);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await updateAreaAction(area.id, { name, icon, minimumStandard: standard });
          if (!res.ok) return setError(res.error);
          router.push(`/areas/${area.id}`);
        });
      }}
    >
      <div className="flex gap-3">
        <Field label="Icon">
          <input value={icon} onChange={(e) => setIcon(e.target.value)} className={`${inputClass} w-20 text-center text-2xl`} maxLength={8} />
        </Field>
        <div className="flex-1">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
          </Field>
        </div>
      </div>
      <Field label="Minimum standard" hint="What does “done” mean for this area? Agree on it together.">
        <textarea value={standard} onChange={(e) => setStandard(e.target.value)} rows={5} className={inputClass} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button
        type="button"
        variant="danger"
        className="w-full"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete “${area.name}”? Its tasks will be kept, just without an area.`)) return;
          startTransition(async () => {
            const res = await deleteAreaAction(area.id);
            if (!res.ok) return setError(res.error);
            router.push("/areas");
          });
        }}
      >
        Delete area
      </Button>
    </form>
  );
}
