import Link from "next/link";
import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { InviteLink } from "@/components/invite-link";
import { buttonClass, PageSkeleton } from "@/components/ui";
import { Steps } from "@/components/steps";

export const metadata = { title: "Invite your partner" };

export default function InviteStep({ searchParams }: PageProps<"/onboarding/invite">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Invite searchParams={searchParams} />
    </Suspense>
  );
}

async function Invite({ searchParams }: { searchParams: PageProps<"/onboarding/invite">["searchParams"] }) {
  const { t } = await searchParams;
  const { snap } = await requireHousehold();
  const partner = snap.members.find((m) => m.pending);
  const name = partner && partner.firstName !== "Partner" ? partner.firstName : "your partner";

  return (
    <>
      <Steps current={2} />
      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">Invite {name}</h1>
      <p className="mt-2 text-lg text-muted">
        Send this link by text. When {name} opens it and signs in, they join your household. Any areas you give them are waiting.
      </p>
      <div className="mt-6">
        {typeof t === "string" ? (
          <InviteLink token={t} inviteeName={partner?.firstName} />
        ) : (
          <p className="text-muted">You can make an invite link any time from Settings.</p>
        )}
      </div>
      <Link href="/onboarding/areas" className={buttonClass("primary", "mt-8 w-full")}>
        Next: choose your areas
      </Link>
      <p className="mt-3 text-center text-sm text-muted">You can also invite them later from Settings.</p>
    </>
  );
}
