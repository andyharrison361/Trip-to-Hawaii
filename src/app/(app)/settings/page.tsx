import Link from "next/link";
import { Suspense } from "react";
import { requireHousehold, getSessionUser } from "@/lib/session";
import { listApiTokens } from "@/lib/core/api-tokens";
import { signOutAction } from "@/app/actions";
import { Avatar, Card, PageHeader, PageSkeleton, SectionTitle, buttonClass } from "@/components/ui";
import { ChevronRightIcon } from "@/components/icons";
import { InviteCard, NameField, HouseholdNameField, TokensCard } from "./settings-forms";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const { ctx, snap } = await requireHousehold();
  const [user, tokens] = await Promise.all([getSessionUser(), listApiTokens(ctx)]);
  const pending = snap.members.find((m) => m.pending);

  return (
    <>
      <PageHeader title="Settings" />

      <SectionTitle>You</SectionTitle>
      <Card className="space-y-4">
        <NameField initial={snap.me.display_name} />
        {user?.email && <p className="px-1 text-sm text-muted">Signed in as {user.email}</p>}
      </Card>

      <SectionTitle>Household</SectionTitle>
      <Card className="space-y-4">
        <HouseholdNameField initial={snap.household.name} />
        <ul className="space-y-2">
          {snap.members.map((m) => (
            <li key={m.id ?? "pending"} className="flex items-center gap-3 px-1">
              <Avatar initial={m.initial} pending={m.pending} tone={m.tone} />
              <span>
                {m.name}
                {m.id === ctx.userId && <span className="text-muted"> (you)</span>}
                {m.pending && <span className="text-muted"> (invited, hasn&apos;t joined yet)</span>}
              </span>
            </li>
          ))}
        </ul>
        {pending && <InviteCard inviteeName={pending.firstName === "Partner" ? "" : pending.firstName} />}
      </Card>

      <SectionTitle>On your iPhone</SectionTitle>
      <Link href="/install" className="flex min-h-14 items-center justify-between rounded-3xl bg-card px-4 ring-1 ring-line active:bg-sage-soft/60">
        Add to Home Screen
        <ChevronRightIcon className="h-5 w-5 text-muted" />
      </Link>

      <SectionTitle>Shortcuts & API</SectionTitle>
      <TokensCard
        tokens={tokens.map((t) => ({ id: t.id as string, name: t.name as string, lastUsed: (t.last_used_at as string | null) ?? null }))}
      />

      <form action={signOutAction} className="mt-10">
        <button className={buttonClass("ghost", "w-full")}>Sign out</button>
      </form>
    </>
  );
}
