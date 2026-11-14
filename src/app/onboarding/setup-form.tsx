"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setupHouseholdAction } from "@/app/actions";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

export function SetupForm({ initialName }: { initialName: string }) {
  const [myName, setMyName] = useState(initialName);
  const [partnerName, setPartnerName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [kids, setKids] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await setupHouseholdAction({
            myName,
            partnerName,
            householdName,
            kidNames: kids.split(/[,\n]|\band\b/i).map((k) => k.trim()).filter(Boolean),
          });
          if (!res.ok) return setError(res.error);
          router.push(`/onboarding/invite?t=${encodeURIComponent(res.data)}`);
        });
      }}
    >
      <Field label="Your first name">
        <input value={myName} onChange={(e) => setMyName(e.target.value)} autoComplete="given-name" className={inputClass} required />
      </Field>
      <Field label="Your partner's first name">
        <input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className={inputClass} required />
      </Field>
      <Field label="Household name" hint="Just a label, e.g. “The Smiths”.">
        <input
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          placeholder={myName ? `${myName} & ${partnerName || "…"}` : "Our home"}
          className={inputClass}
        />
      </Field>
      <Field label="Kids' first names (optional)" hint="Separate with commas. Each gets a color in the planner. You can add or change them later.">
        <input value={kids} onChange={(e) => setKids(e.target.value)} placeholder="Emma, Jake" className={inputClass} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Setting up…" : "Continue"}
      </Button>
    </form>
  );
}
