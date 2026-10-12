import { NextResponse } from "next/server";
import { apiError, getApiCtx, unauthorized } from "@/lib/api";
import { completeTask } from "@/lib/core/tasks";

/** POST /api/v1/tasks/:id/complete — marks it done; repeating tasks get their next occurrence. */
export async function POST(request: Request, { params }: RouteContext<"/api/v1/tasks/[id]/complete">) {
  const ctx = await getApiCtx(request);
  if (!ctx) return unauthorized();
  try {
    const { id } = await params;
    const result = await completeTask(ctx, id);
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}
