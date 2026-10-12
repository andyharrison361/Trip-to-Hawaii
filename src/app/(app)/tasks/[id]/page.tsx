import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireHousehold } from "@/lib/session";
import { getTask } from "@/lib/core/tasks";
import { NotFoundError } from "@/lib/core/context";
import { formatRelativeDate, nowInTimeZone } from "@/lib/dates";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { TaskForm } from "./task-form";

export const metadata = { title: "Task" };

export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TaskDetail params={params} />
    </Suspense>
  );
}

async function TaskDetail({ params }: { params: PageProps<"/tasks/[id]">["params"] }) {
  const { id } = await params;
  const { ctx, snap } = await requireHousehold();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const task = await getTask(ctx, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const area = snap.areas.find((a) => a.id === task.area_id);
  const completedBy = snap.members.find((m) => m.id === task.completed_by)?.firstName;

  return (
    <>
      <PageHeader back={area ? `/areas/${area.id}` : "/"} title={task.status === "done" ? "Done ✓" : "Task"} />
      {task.status === "done" && task.completed_at && (
        <p className="mt-1 text-muted">
          Completed by {completedBy ?? "someone"}{" "}
          {formatRelativeDate(nowInTimeZone(ctx.timezone, new Date(task.completed_at)).date, snap.today).toLowerCase()}.
        </p>
      )}
      <TaskForm
        task={task}
        today={snap.today}
        currentUserId={ctx.userId}
        areas={snap.areas.map((a) => ({ id: a.id, name: a.name, icon: a.icon, ownerId: a.owner_id }))}
        people={snap.members.map((m) => ({ id: m.id, firstName: m.firstName, pending: m.pending }))}
      />
    </>
  );
}
