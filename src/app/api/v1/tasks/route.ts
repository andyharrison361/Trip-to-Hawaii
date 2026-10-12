import { NextResponse } from "next/server";
import { apiError, getApiCtx, readJson, unauthorized } from "@/lib/api";
import { createTask, listOpenTasks } from "@/lib/core/tasks";
import { addDays, todayIn } from "@/lib/dates";

/**
 * GET /api/v1/tasks?scope=today|upcoming|all&mine=true
 *   today    = overdue + due today
 *   upcoming = due in the next 14 days
 *   all      = every open task
 */
export async function GET(request: Request) {
  const ctx = await getApiCtx(request);
  if (!ctx) return unauthorized();
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") ?? "today";
    const mine = url.searchParams.get("mine") !== "false";
    const today = todayIn(ctx.timezone);
    const tasks = await listOpenTasks(ctx, {
      assigneeId: mine ? ctx.userId : undefined,
      dueOnOrBefore: scope === "today" ? today : scope === "upcoming" ? addDays(today, 14) : undefined,
    });
    return NextResponse.json({ tasks });
  } catch (e) {
    return apiError(e);
  }
}

/** POST /api/v1/tasks with {title, areaId?, assigneeId?, dueDate?, dueTime?, recurrence?, recurrenceMode?, notes?} */
export async function POST(request: Request) {
  const ctx = await getApiCtx(request);
  if (!ctx) return unauthorized();
  try {
    const task = await createTask(ctx, (await readJson(request)) as never);
    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
