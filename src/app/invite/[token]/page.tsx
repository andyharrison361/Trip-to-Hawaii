import Link from "next/link";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/session";
import { findHousehold } from "@/lib/core/context";
import { buttonClass, PageSkeleton } from "@/components/ui";
import { AcceptInvite } from "./accept-invite";

export const metadata = { title: "You're invited" };

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-16">
      <Suspense fallback={<PageSkeleton />}>
        <Invite params={params} />
      </Suspense>
    </main>
  );
}

async function Invite({ params }: { params: PageProps<"/invite/[token]">["params"] }) {
  const { token } = await params;
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">You&apos;ve been invited 💛</h1>
        <p className="text-lg text-muted">
          Join your partner&apos;s household on Life Partner, so you can share ownership of everything that keeps your life running.
        </p>
        <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className={buttonClass("primary", "w-full")}>
          Sign in to join
        </Link>
      </div>
    );
  }

  const already = await findHousehold(user.db, user.userId);
  const { data } = await user.db.rpc("get_invite", { p_token: token });
  const invite = (Array.isArray(data) ? data[0] : data) as
    | { household_name: string | null; inviter_name: string | null; invitee_name: string | null; status: string }
    | undefined;

  if (already) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">You&apos;re already in a household</h1>
        <p className="text-muted">This account already belongs to a household, so it can&apos;t join another one yet.</p>
        <Link href="/" className={buttonClass("primary", "w-full")}>
          Go to Today
        </Link>
      </div>
    );
  }

  if (!invite || invite.status !== "ok") {
    const why =
      invite?.status === "used"
        ? "This link has already been used."
        : invite?.status === "expired"
          ? "This link has expired."
          : invite?.status === "full"
            ? "That household is already full."
            : "This link isn't valid.";
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Hmm, that didn&apos;t work</h1>
        <p className="text-muted">{why} Ask your partner to send a fresh invite link from Settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {invite.invitee_name ? `Hi ${invite.invitee_name}!` : "You're invited!"}
      </h1>
      <p className="text-lg text-muted">
        {invite.inviter_name || "Your partner"} invited you to join <span className="font-medium text-ink">{invite.household_name}</span>.
      </p>
      <AcceptInvite token={token} suggestedName={invite.invitee_name ?? ""} />
    </div>
  );
}
