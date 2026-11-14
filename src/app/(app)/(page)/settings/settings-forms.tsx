"use client";

import { useState, useTransition } from "react";
import {
  createApiTokenAction,
  createInviteAction,
  createKidAction,
  deleteKidAction,
  updateKidAction,
  revokeApiTokenAction,
  updateHouseholdNameAction,
  updateProfileNameAction,
} from "@/app/actions";
import { useToast } from "@/components/toast";
import { Button, Card, ErrorText, Field, cx, inputClass } from "@/components/ui";
import { KID_COLORS, KID_COLOR_NAMES, kidColor } from "@/lib/colors";
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
        A personal key lets a Siri Shortcut (or anything else) add things to your planner. Keep keys private.
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

type Kid = { id: string; name: string; color: string };

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
      {KID_COLOR_NAMES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={KID_COLORS[c].label}
          onClick={() => onChange(c)}
          className={cx(
            "flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-line",
            value === c && "ring-2 ring-ink",
          )}
        >
          <span className={cx("h-6 w-6 rounded-full", KID_COLORS[c].dot)} />
        </button>
      ))}
    </div>
  );
}

function KidRowEditor({ kid }: { kid: Kid }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(kid.name);
  const [color, setColor] = useState(kid.color);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (!editing) {
    return (
      <li className="flex min-h-12 items-center gap-3">
        <span className={cx("h-4 w-4 shrink-0 rounded-full", kidColor(kid.color).dot)} />
        <span className="flex-1">{kid.name}</span>
        <button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-full px-3 text-sm text-accent-strong active:bg-accent-soft">
          Edit
        </button>
      </li>
    );
  }
  return (
    <li className="space-y-3 py-3">
      <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} aria-label="Name" />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1"
          disabled={pending || !name.trim()}
          onClick={() =>
            startTransition(async () => {
              const res = await updateKidAction(kid.id, { name, color: color as keyof typeof KID_COLORS });
              if (!res.ok) return toast({ message: res.error });
              setEditing(false);
            })
          }
        >
          Save
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() =>
            confirm(`Remove ${kid.name}? Anything tagged for ${kid.name} stays on the planner, just untagged.`) &&
            startTransition(async () => {
              const res = await deleteKidAction(kid.id);
              if (!res.ok) toast({ message: res.error });
            })
          }
        >
          Remove
        </Button>
      </div>
    </li>
  );
}

export function KidsCard({ kids }: { kids: Kid[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Card className="space-y-3">
      <p className="text-sm text-muted">
        Kids don&apos;t need an account. Tag practices, appointments and chores with their name, and filter the week to just them.
      </p>
      {kids.length > 0 && (
        <ul className="divide-y divide-line">
          {kids.map((k) => (
            <KidRowEditor key={k.id} kid={k} />
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const res = await createKidAction({ name });
            if (!res.ok) return setError(res.error);
            setName("");
          });
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a child's name" className={inputClass} aria-label="Child's name" />
        <Button type="submit" variant="secondary" disabled={pending || !name.trim()} className="shrink-0">
          Add
        </Button>
      </form>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
