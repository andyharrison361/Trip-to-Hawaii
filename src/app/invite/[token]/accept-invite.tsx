"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptInviteAction, updateProfileNameAction } from "@/app/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

export function AcceptInvite({ token, suggestedName }: { token: string; suggestedName: string }) {
  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const named = await updateProfileNameAction(name);
          if (!named.ok) return setError(named.error);
          const res = await acceptInviteAction(token);
          if (!res.ok) return setError(res.error);
          router.replace("/onboarding/install");
        });
      }}
    >
      <Field label="Your first name">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoComplete="given-name" required />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Joining…" : "Join household"}
      </Button>
    </form>
  );
}
