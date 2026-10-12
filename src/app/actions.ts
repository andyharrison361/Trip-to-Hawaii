"use server";

// Server actions: thin wrappers that resolve the signed-in user's context,
// call the shared core layer, and refresh the UI.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCtx, getSessionUser } from "@/lib/session";
import { ValidationError } from "@/lib/core/context";
import * as tasks from "@/lib/core/tasks";
import * as areas from "@/lib/core/areas";
import * as apiTokens from "@/lib/core/api-tokens";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import type { TaskRow } from "@/lib/types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function refreshAll() {
  revalidatePath("/", "layout");
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    refreshAll();
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    const message =
      e instanceof ValidationError || (e instanceof Error && e.message.length < 140)
        ? (e as Error).message
        : "Something went wrong. Please try again.";
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------- Tasks

export async function createTaskAction(input: tasks.TaskInput): Promise<ActionResult<TaskRow>> {
  return run(async () => tasks.createTask(await getCtx(), input));
}

export async function updateTaskAction(id: string, input: tasks.TaskInput): Promise<ActionResult<TaskRow>> {
  return run(async () => tasks.updateTask(await getCtx(), id, input));
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  return run(async () => {
    await tasks.deleteTask(await getCtx(), id);
    return undefined;
  });
}

export async function completeTaskAction(id: string): Promise<ActionResult<{ nextId: string | null; nextDue: string | null }>> {
  return run(async () => {
    const { next } = await tasks.completeTask(await getCtx(), id);
    return { nextId: next?.id ?? null, nextDue: next?.due_date ?? null };
  });
}

export async function reopenTaskAction(id: string, nextId: string | null): Promise<ActionResult> {
  return run(async () => {
    await tasks.reopenTask(await getCtx(), id, nextId);
    return undefined;
  });
}

export async function createFromBundleAction(args: {
  areaId: string;
  bundleKey: string;
  name: string;
  date: string;
}): Promise<ActionResult<number>> {
  return run(async () => (await tasks.createFromBundle(await getCtx(), args)).length);
}

export async function addSuggestedTaskAction(areaId: string, taskIndex: number): Promise<ActionResult<number>> {
  return run(async () => areas.createStarterTasks(await getCtx(), [{ areaId, taskIndex, dueDate: null }]));
}

// ---------------------------------------------------------------- Areas

export async function createAreaAction(input: areas.AreaInput): Promise<ActionResult<string>> {
  return run(async () => (await areas.createArea(await getCtx(), input)).id);
}

export async function createAreaFromCatalogAction(key: string, ownerId: string | null): Promise<ActionResult<string>> {
  return run(async () => {
    const [area] = await areas.createAreasFromCatalog(await getCtx(), [{ key, ownerId }]);
    if (!area) throw new ValidationError("Couldn't add that area");
    return area.id;
  });
}

export async function updateAreaAction(
  id: string,
  input: { name: string; icon?: string | null; minimumStandard?: string },
): Promise<ActionResult> {
  return run(async () => {
    await areas.updateArea(await getCtx(), id, input);
    return undefined;
  });
}

export async function deleteAreaAction(id: string): Promise<ActionResult> {
  return run(async () => {
    await areas.deleteArea(await getCtx(), id);
    return undefined;
  });
}

export async function handOffAreaAction(areaId: string, toUserId: string, note: string): Promise<ActionResult> {
  return run(async () => {
    await areas.handOffArea(await getCtx(), areaId, toUserId, note);
    return undefined;
  });
}

// ---------------------------------------------------------------- Household & profile

export async function updateProfileNameAction(name: string): Promise<ActionResult> {
  return run(async () => {
    const user = await getSessionUser();
    if (!user) throw new ValidationError("Please sign in again");
    const clean = name.trim();
    if (!clean) throw new ValidationError("Please enter your name");
    const { error } = await user.db.from("profiles").update({ display_name: clean }).eq("id", user.userId);
    if (error) throw error;
    return undefined;
  });
}

export async function updateHouseholdNameAction(name: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await getCtx();
    const clean = name.trim();
    if (!clean) throw new ValidationError("Please enter a name");
    const { error } = await ctx.db.from("households").update({ name: clean }).eq("id", ctx.householdId);
    if (error) throw error;
    return undefined;
  });
}

export async function createInviteAction(inviteeName?: string): Promise<ActionResult<string>> {
  return run(async () => areas.createInvite(await getCtx(), inviteeName ?? null));
}

export async function acceptInviteAction(token: string): Promise<ActionResult> {
  return run(async () => {
    const user = await getSessionUser();
    if (!user) throw new ValidationError("Please sign in first");
    const { error } = await user.db.rpc("accept_invite", { p_token: token });
    if (error) throw new ValidationError(error.message);
    return undefined;
  });
}

/** Onboarding step 1: name yourself, create the household, invite your partner. */
export async function setupHouseholdAction(input: {
  myName: string;
  householdName: string;
  partnerName: string;
}): Promise<ActionResult<string>> {
  return run(async () => {
    const user = await getSessionUser();
    if (!user) throw new ValidationError("Please sign in again");
    const myName = input.myName.trim();
    if (!myName) throw new ValidationError("Please enter your name");

    const { error: profileError } = await user.db
      .from("profiles")
      .update({ display_name: myName })
      .eq("id", user.userId);
    if (profileError) throw profileError;

    const { data: householdId, error } = await user.db.rpc("create_household", {
      p_name: input.householdName.trim() || `${myName}'s home`,
      p_timezone: DEFAULT_TIMEZONE,
    });
    if (error) throw new ValidationError(error.message);

    const { data: token, error: inviteError } = await user.db.rpc("create_invite", {
      p_household_id: householdId,
      p_invitee_name: input.partnerName.trim() || null,
    });
    if (inviteError) throw inviteError;
    return token as string;
  });
}

export async function setupAreasAction(selections: areas.AreaSelection[]): Promise<ActionResult<number>> {
  return run(async () => {
    const ctx = await getCtx();
    const { count } = await ctx.db
      .from("areas")
      .select("id", { count: "exact", head: true })
      .eq("household_id", ctx.householdId);
    if ((count ?? 0) > 0) return 0; // already set up (e.g. double submit)
    return (await areas.createAreasFromCatalog(ctx, selections)).length;
  });
}

export async function setupStarterTasksAction(picks: areas.StarterPick[]): Promise<ActionResult<number>> {
  return run(async () => {
    const ctx = await getCtx();
    const { count } = await ctx.db
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("household_id", ctx.householdId);
    if ((count ?? 0) > 0) return 0;
    return areas.createStarterTasks(ctx, picks);
  });
}

// ---------------------------------------------------------------- API tokens

export async function createApiTokenAction(name: string): Promise<ActionResult<string>> {
  return run(async () => apiTokens.createApiToken(await getCtx(), name));
}

export async function revokeApiTokenAction(id: string): Promise<ActionResult> {
  return run(async () => {
    await apiTokens.revokeApiToken(await getCtx(), id);
    return undefined;
  });
}

// ---------------------------------------------------------------- Auth

export async function signOutAction() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/login");
}
