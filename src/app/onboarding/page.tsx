import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/session";
import { findHousehold } from "@/lib/core/context";
import { PageSkeleton } from "@/components/ui";
import { Steps } from "@/components/steps";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Welcome" };

export default function OnboardingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const household = await findHousehold(user.db, user.userId);
  if (household) {
    const { count } = await user.db
      .from("areas")
      .select("id", { count: "exact", head: true })
      .eq("household_id", household.householdId);
    redirect(count ? "/" : "/onboarding/areas");
  }
  const { data: profile } = await user.db.from("profiles").select("display_name").eq("id", user.userId).single();

  return (
    <>
      <Steps current={1} />
      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">Welcome 👋</h1>
      <p className="mt-2 text-lg text-muted">
        Let&apos;s set up your household. It takes about three minutes. Everything can be changed later.
      </p>
      <SetupForm initialName={profile?.display_name ?? ""} />
      <p className="mt-6 text-center text-sm text-muted">Did your partner send you an invite link? Open that link instead.</p>
    </>
  );
}
