import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { AREA_CATALOG, CATEGORIES } from "@/lib/catalog";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { NewAreaForm } from "./new-area-form";

export const metadata = { title: "Add an area" };

export default function NewAreaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewArea />
    </Suspense>
  );
}

async function NewArea() {
  const { ctx, snap } = await requireHousehold();
  const used = new Set(snap.areas.map((a) => a.template_key).filter(Boolean));
  const available = AREA_CATALOG.filter((a) => !used.has(a.key)).map((a) => ({
    key: a.key,
    name: a.name,
    icon: a.icon,
    category: a.category,
    minimumStandard: a.minimumStandard,
    taskCount: a.starterTasks.length,
  }));
  return (
    <>
      <PageHeader back="/areas" title="Add an area" subtitle="Pick from the list or make your own." />
      <NewAreaForm
        currentUserId={ctx.userId}
        people={snap.members.map((m) => ({ id: m.id, firstName: m.firstName, pending: m.pending }))}
        categories={CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
        catalog={available}
      />
    </>
  );
}
