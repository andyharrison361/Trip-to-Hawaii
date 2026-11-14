// Kids' profiles: household people who don't sign in. Items can be tagged with
// one or more kids, and the planner can be filtered to one child.

import { z } from "zod";
import { isValidISODate } from "@/lib/dates";
import { KID_COLOR_NAMES, nextKidColor, type KidColor } from "@/lib/colors";
import type { KidRow } from "@/lib/types";
import { ValidationError, type Ctx } from "./context";

const kidSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(40, "That name is a bit long"),
  color: z.enum(KID_COLOR_NAMES as [KidColor, ...KidColor[]]).optional(),
  birthday: z
    .string()
    .nullable()
    .optional()
    .refine((v) => v == null || v === "" || isValidISODate(v), "Invalid birthday")
    .transform((v) => (v ? v : null)),
});

export type KidInput = z.input<typeof kidSchema>;

function parse(input: unknown) {
  const result = kidSchema.safeParse(input);
  if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? "Invalid name");
  return result.data;
}

export async function listKids(ctx: Ctx): Promise<KidRow[]> {
  const { data, error } = await ctx.db
    .from("kids")
    .select("*")
    .eq("household_id", ctx.householdId)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as KidRow[];
}

export async function createKids(ctx: Ctx, inputs: KidInput[]): Promise<KidRow[]> {
  if (inputs.length === 0) return [];
  const existing = await listKids(ctx);
  const used = existing.map((k) => k.color);
  const rows = inputs.map((input, i) => {
    const v = parse(input);
    const color = v.color ?? nextKidColor(used);
    used.push(color);
    return {
      household_id: ctx.householdId,
      name: v.name,
      color,
      birthday: v.birthday ?? null,
      sort_order: existing.length + i,
    };
  });
  const { data, error } = await ctx.db.from("kids").insert(rows).select("*");
  if (error) throw error;
  return data as KidRow[];
}

export async function updateKid(ctx: Ctx, id: string, input: KidInput): Promise<void> {
  const v = parse(input);
  const { error } = await ctx.db
    .from("kids")
    .update({ name: v.name, ...(v.color ? { color: v.color } : {}), birthday: v.birthday ?? null })
    .eq("id", id)
    .eq("household_id", ctx.householdId);
  if (error) throw error;
}

/** Removes the profile. Items tagged with this child stay, just untagged. */
export async function deleteKid(ctx: Ctx, id: string): Promise<void> {
  const { error } = await ctx.db.from("kids").delete().eq("id", id).eq("household_id", ctx.householdId);
  if (error) throw error;
}
