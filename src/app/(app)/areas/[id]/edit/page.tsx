import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { AreaEditForm } from "./area-edit-form";

export const metadata = { title: "Edit area" };

export default function EditAreaPage({ params }: PageProps<"/areas/[id]/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditArea params={params} />
    </Suspense>
  );
}

async function EditArea({ params }: { params: PageProps<"/areas/[id]/edit">["params"] }) {
  const { id } = await params;
  const { snap } = await requireHousehold();
  const area = snap.areas.find((a) => a.id === id);
  if (!area) notFound();
  return (
    <>
      <PageHeader back={`/areas/${id}`} title="Edit area" />
      <AreaEditForm area={{ id: area.id, name: area.name, icon: area.icon ?? "", minimumStandard: area.minimum_standard }} />
    </>
  );
}
