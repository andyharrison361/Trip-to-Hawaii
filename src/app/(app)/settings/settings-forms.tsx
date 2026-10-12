"use client";

import { useState, useTransition } from "react";
import {
  createApiTokenAction,
  createInviteAction,
  revokeApiTokenAction,
  updateHouseholdNameAction,
  updateProfileNameAction,
} from "@/app/actions";
import { useToast } from "@/components/toast";
import { Button, Card, ErrorText, Field, inputClass } from "@/components/ui";
import { InviteLink } from "@/components/invite-link";

function InlineSave({
  label,
  initial,
  save,
}: {
  label: string;
  initial: string;
  save: (v: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const dirty = value.trim() !== initial;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await save(value);
          toast({ message: res.ok ? "Saved" : (res.error ?? "Couldn't save") });
        });
      }}
    >
      <Field label={label}>
        <div className="flex gap-2">
          <input value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} />
          {dirty && (
            <Button type="submit" disabled={pending} className="shrink-0">
              Save
            </Button>
          )}
        </div>
      </Field>
    </form>
  );
}

export function NameField({ initial }: { initial: string }) {
  return <InlineSave label="Your name" initial={initial} save={updateProfileNameAction} />;
}

export function HouseholdNameField({ initial }: { initial: string }) {
  return <InlineSave label="Household name" initial={initial} save={updateHouseholdNameAction} />;
}

export function InviteCard({ inviteeName }: { inviteeName: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-3 rounded-2xl bg-canvas p-3">
      {token ? (
        <InviteLink token={token} inviteeName={inviteeName} />
      ) : (
        <>
          <p className="text-sm text-muted">Make a fresh invite link. It replaces any earlier one and works for 30 days.</p>
          <Button
            variant="secondary"
            className="w-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await createInviteAction(inviteeName || undefined);
                if (!res.ok) return setError(res.error);
                setToken(res.data);
              })
            }
          >
            {pending ? "Creating…" : `Invite ${inviteeName || "your partner"}`}
          </Button>
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

export function TokensCard({ tokens }: { tokens: { id: string; name: string; lastUsed: string | null }[] }) {
  const [newToken, setNewToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <Card className="space-y-4">
      <p className="text-sm text-muted">
        A personal key lets a Siri Shortcut (or anything else) add tasks for you. See the README for the Shortcut setup. Keep keys private.
      </p>
      {newToken && (
        <div className="space-y-2 rounded-2xl bg-sun-soft p-3">
          <p className="text-sm font-medium">Copy this key now. It won&apos;t be shown again.</p>
          <code className="block break-all rounded-xl bg-card p-3 text-sm">{newToken}</code>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigator.clipboard.writeText(newToken).then(() => toast({ message: "Copied" }))}
          >
            Copy key
          </Button>
        </div>
      )}
      {tokens.length > 0 && (
        <ul className="divide-y divide-line">
          {tokens.map((t) => (
            <li key={t.id} className="flex min-h-12 items-center justify-between gap-3">
              <span>
                {t.name}
                <span className="block text-sm text-muted">{t.lastUsed ? `Last used ${new Date(t.lastUsed).toLocaleDateString()}` : "Never used"}</span>
              </span>
              <button
                className="min-h-11 rounded-full px-3 text-sm text-clay active:bg-clay-soft"
                onClick={() =>
                  confirm(`Revoke “${t.name}”? Anything using it will stop working.`) &&
                  startTransition(async () => {
                    await revokeApiTokenAction(t.id);
                  })
                }
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="secondary"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await createApiTokenAction("Siri Shortcut");
            if (res.ok) setNewToken(res.data);
            else toast({ message: res.error });
          })
        }
      >
        Create a key
      </Button>
    </Card>
  );
}
