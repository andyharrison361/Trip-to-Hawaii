import { describe, expect, it } from "vitest";
import { buildPlanner, daysInRange, filterPlanner, overdueItems } from "../planner";
import type { TaskRow } from "../types";

let n = 0;
function item(over: Partial<TaskRow>): TaskRow {
  n += 1;
  return {
    id: `t${n}`,
    household_id: "h",
    area_id: null,
    kind: "task",
    title: `Item ${n}`,
    notes: "",
    location: "",
    kid_ids: [],
    assignee_id: "u1",
    created_by: "u1",
    due_date: null,
    due_time: null,
    end_time: null,
    remind_days_before: null,
    reminder_time: null,
    recurrence: null,
    recurrence_mode: "fixed",
    series_id: null,
    status: "open",
    completed_at: null,
    completed_by: null,
    created_at: `2026-11-01T00:00:${String(n).padStart(2, "0")}Z`,
    updated_at: "2026-11-01T00:00:00Z",
    ...over,
  };
}

// Week of Mon Nov 16 – Sun Nov 22, 2026
const FROM = "2026-11-16";
const TO = "2026-11-22";

describe("buildPlanner", () => {
  it("has an entry for every day in the range", () => {
    expect([...buildPlanner([], FROM, TO).keys()]).toEqual(daysInRange(FROM, TO));
    expect(daysInRange(FROM, TO)).toHaveLength(7);
  });

  it("puts one-off items on their day, done or not", () => {
    const a = item({ due_date: "2026-11-17" });
    const b = item({ due_date: "2026-11-17", status: "done" });
    const outside = item({ due_date: "2026-11-30" });
    const days = buildPlanner([a, b, outside], FROM, TO);
    expect(days.get("2026-11-17")!.map((i) => i.task.id)).toEqual([a.id, b.id]);
    expect([...days.values()].flat()).toHaveLength(2);
  });

  it("shows every occurrence of a repeating event, including ones that started earlier", () => {
    const practice = item({
      kind: "event",
      title: "Soccer practice",
      due_date: "2026-11-03",
      due_time: "17:00",
      recurrence: "FREQ=WEEKLY;BYDAY=TU,TH",
    });
    const days = buildPlanner([practice], FROM, TO);
    const dates = [...days].filter(([, items]) => items.length).map(([d]) => d);
    expect(dates).toEqual(["2026-11-17", "2026-11-19"]);
    expect(days.get("2026-11-17")![0].projected).toBe(false);
  });

  it("doesn't show a repeating event before its first date", () => {
    const lessons = item({ kind: "event", due_date: "2026-11-19", recurrence: "FREQ=WEEKLY" });
    const dates = [...buildPlanner([lessons], FROM, TO)].filter(([, i]) => i.length).map(([d]) => d);
    expect(dates).toEqual(["2026-11-19"]);
  });

  it("projects later dates of a repeating chore, faintly", () => {
    const trash = item({ kind: "chore", due_date: "2026-11-10", recurrence: "FREQ=WEEKLY;BYDAY=TU" });
    const days = buildPlanner([trash], "2026-11-09", "2026-11-22");
    expect(days.get("2026-11-10")![0].projected).toBe(false);
    expect(days.get("2026-11-17")![0].projected).toBe(true);
  });

  it("doesn't project chores counted from completion, or finished ones", () => {
    const filter = item({ due_date: "2026-11-16", recurrence: "FREQ=WEEKLY", recurrence_mode: "after_completion" });
    const done = item({ due_date: "2026-11-09", recurrence: "FREQ=WEEKLY", status: "done" });
    const all = [...buildPlanner([filter, done], FROM, TO).values()].flat();
    expect(all.map((i) => i.task.id)).toEqual([filter.id]);
  });

  it("orders a day: timed items by time, then all-day events, then to-dos", () => {
    const todo = item({ due_date: "2026-11-18" });
    const late = item({ kind: "event", due_date: "2026-11-18", due_time: "18:00" });
    const early = item({ due_date: "2026-11-18", due_time: "08:30" });
    const allDay = item({ kind: "event", due_date: "2026-11-18" });
    const ids = buildPlanner([todo, late, early, allDay], FROM, TO).get("2026-11-18")!.map((i) => i.task.id);
    expect(ids).toEqual([early.id, late.id, allDay.id, todo.id]);
  });
});

describe("overdueItems", () => {
  it("includes late to-dos but never events", () => {
    const late = item({ due_date: "2026-11-10" });
    const pastEvent = item({ kind: "event", due_date: "2026-11-10" });
    const done = item({ due_date: "2026-11-10", status: "done" });
    expect(overdueItems([late, pastEvent, done], "2026-11-16")).toEqual([late]);
  });
});

describe("filterPlanner", () => {
  it("filters by kid and by person", () => {
    const emma = item({ due_date: "2026-11-17", kid_ids: ["k1"], assignee_id: "u2" });
    const mine = item({ due_date: "2026-11-17" });
    const days = buildPlanner([emma, mine], FROM, TO);
    expect(filterPlanner(days, { kidId: "k1" }).get("2026-11-17")!.map((i) => i.task.id)).toEqual([emma.id]);
    expect(filterPlanner(days, { memberId: "u1" }).get("2026-11-17")!.map((i) => i.task.id)).toEqual([mine.id]);
  });
});
