import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { CATALOG_BY_KEY } from "@/lib/catalog";
import { defaultFirstDue } from "@/lib/core/areas";
import { describeRecurrence } from "@/lib/recurrence";
import { PageSkeleton } from "@/components/ui";
import { Steps } from "@/components/steps";
import { StarterPicker } from "./starter-picker";

export const metadata = { title: "Starter tasks" };

export default function TasksStep() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Tasks />
    </Suspense>
  );
}

async function Tasks() {
  const { ctx, snap } = await requireHousehold();
  if (snap.areas.length === 0) redirect("/onboarding/areas");
  const { count } = await ctx.db
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("household_id", ctx.householdId);
  if (count) redirect("/onboarding/install");

  const groups = snap.areas
    .map((area) => {
      const template = area.template_key ? CATALOG_BY_KEY.get(area.template_key) : undefined;
      const owner = area.owner_id ? snap.members.find((m) => m.id === area.owner_id) : snap.members.find((m) => m.pending);
      return {
        areaId: area.id,
        name: area.name,
        icon: area.icon ?? "•",
        ownerName: owner?.firstName ?? "",
        tasks: (template?.starterTasks ?? []).map((t, index) => ({
          index,
          title: t.title,
          repeat: t.rule ? describeRecurrence(t.rule, t.mode) : null,
          notes: t.notes ?? null,
          defaultOn: t.defaultOn !== false,
          firstDue: defaultFirstDue(t, snap.today),
        })),
      };
    })
    .filter((g) => g.tasks.length > 0);

  return (
    <>
      <Steps current={4} />
      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">Starter tasks</h1>
      <p className="mt-2 text-lg text-muted">
        Here are the repeating jobs that usually come with each area. Keep what fits and set the first date if you know it. When you finish one, the next is scheduled automatically.
      </p>
      <StarterPicker groups={groups} />
    </>
  );
}
