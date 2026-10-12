import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { AREA_CATALOG, CATEGORIES } from "@/lib/catalog";
import { PageSkeleton } from "@/components/ui";
import { Steps } from "@/components/steps";
import { AreaPicker } from "./area-picker";

export const metadata = { title: "Choose your areas" };

export default function AreasStep() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Areas />
    </Suspense>
  );
}

async function Areas() {
  const { ctx, snap } = await requireHousehold();
  if (snap.areas.length > 0) redirect("/onboarding/tasks");
  const partner = snap.members.find((m) => m.id !== ctx.userId);

  return (
    <>
      <Steps current={3} />
      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">Who owns what?</h1>
      <p className="mt-2 text-lg text-muted">
        Owning an area means handling it from start to finish: noticing it needs doing, planning it, and doing it. We&apos;ve pre-picked a few.
        Look through the list. It includes things couples often forget are even jobs.
      </p>
      <AreaPicker
        me={{ id: ctx.userId, firstName: snap.members.find((m) => m.id === ctx.userId)?.firstName ?? "Me" }}
        partner={{ id: partner?.id ?? null, firstName: partner?.firstName ?? "Partner" }}
        categories={CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
        catalog={AREA_CATALOG.map((a) => ({
          key: a.key,
          name: a.name,
          icon: a.icon,
          category: a.category,
          minimumStandard: a.minimumStandard,
          suggested: Boolean(a.suggested),
          suggestedOwner: a.suggestedOwner ?? "me",
        }))}
      />
    </>
  );
}
