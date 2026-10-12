import { NextResponse } from "next/server";
import { apiError, getApiCtx, unauthorized } from "@/lib/api";
import { quickAdd } from "@/lib/core/tasks";
import { describeRecurrence } from "@/lib/recurrence";
import { formatDue, todayIn } from "@/lib/dates";

/**
 * POST /api/v1/quick-add
 * Body: {"text": "pay water bill friday #finances"}  (or the raw text as the body)
 * Returns the created task plus a short sentence suitable for Siri to read back.
 */
export async function POST(request: Request) {
  const ctx = await getApiCtx(request);
  if (!ctx) return unauthorized();
  try {
    const raw = await request.text();
    let text = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.text === "string") text = parsed.text;
    } catch {
      // plain text body
    }
    text = text.trim();
    if (!text) return NextResponse.json({ error: "Say what to add" }, { status: 400 });

    const task = await quickAdd(ctx, text);
    const due = task.due_date ? ` for ${formatDue(task.due_date, task.due_time, todayIn(ctx.timezone)).toLowerCase()}` : "";
    const repeat = task.recurrence ? ` (${describeRecurrence(task.recurrence, task.recurrence_mode).toLowerCase()})` : "";
    return NextResponse.json({ task, message: `Added "${task.title}"${due}${repeat}.` }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
