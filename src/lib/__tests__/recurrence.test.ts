import { describe, expect, it } from "vitest";
import { describeRecurrence, firstOccurrence, nextDueDate, parseRecurrence } from "../recurrence";

const rule = (t: string) => parseRecurrence(t)?.recurrence.rule;

describe("parseRecurrence", () => {
  it.each([
    ["every day", "FREQ=DAILY"],
    ["daily", "FREQ=DAILY"],
    ["every 3 days", "FREQ=DAILY;INTERVAL=3"],
    ["weekly", "FREQ=WEEKLY"],
    ["every week on monday", "FREQ=WEEKLY;BYDAY=MO"],
    ["every monday and thursday", "FREQ=WEEKLY;BYDAY=MO,TH"],
    ["every other week", "FREQ=WEEKLY;INTERVAL=2"],
    ["biweekly", "FREQ=WEEKLY;INTERVAL=2"],
    ["every weekday", "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"],
    ["monthly", "FREQ=MONTHLY"],
    ["monthly on the 20th", "FREQ=MONTHLY;BYMONTHDAY=20"],
    ["every month on the 1st", "FREQ=MONTHLY;BYMONTHDAY=1"],
    ["on the 15th of every month", "FREQ=MONTHLY;BYMONTHDAY=15"],
    ["every 20th", "FREQ=MONTHLY;BYMONTHDAY=20"],
    ["every month on the last day", "FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1"],
    ["every six months", "FREQ=MONTHLY;INTERVAL=6"],
    ["quarterly", "FREQ=MONTHLY;INTERVAL=3"],
    ["every quarter", "FREQ=MONTHLY;INTERVAL=3"],
    ["every year", "FREQ=YEARLY"],
    ["annually", "FREQ=YEARLY"],
  ])("%s", (text, expected) => {
    expect(rule(text)).toBe(expected);
  });

  it("returns null for plain text", () => {
    expect(parseRecurrence("buy coffee")).toBeNull();
  });

  it("detects 'after it's done'", () => {
    expect(parseRecurrence("every 3 months after it's done")?.recurrence.mode).toBe("after_completion");
    expect(parseRecurrence("every 3 months")?.recurrence.mode).toBe("fixed");
  });
});

describe("nextDueDate", () => {
  it("fixed monthly keeps the 20th even when completed late", () => {
    expect(nextDueDate({ rule: "FREQ=MONTHLY;BYMONTHDAY=20", mode: "fixed", dueDate: "2026-10-20", completedOn: "2026-10-23" })).toBe("2026-11-20");
  });

  it("fixed rule skips missed occurrences", () => {
    expect(nextDueDate({ rule: "FREQ=WEEKLY", mode: "fixed", dueDate: "2026-09-01", completedOn: "2026-10-12" })).toBe("2026-10-13");
  });

  it("completed early stays on schedule", () => {
    expect(nextDueDate({ rule: "FREQ=MONTHLY;BYMONTHDAY=20", mode: "fixed", dueDate: "2026-10-20", completedOn: "2026-10-15" })).toBe("2026-11-20");
  });

  it("after completion counts from the completion date", () => {
    expect(nextDueDate({ rule: "FREQ=MONTHLY;INTERVAL=6", mode: "after_completion", dueDate: "2026-10-01", completedOn: "2026-10-12" })).toBe("2027-04-12");
  });

  it("handles last day of month", () => {
    const r = "FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1";
    expect(nextDueDate({ rule: r, mode: "fixed", dueDate: "2027-01-31", completedOn: "2027-01-31" })).toBe("2027-02-28");
  });

  it("quarterly estimated taxes", () => {
    const r = "FREQ=YEARLY;BYMONTH=1,4,6,9;BYMONTHDAY=15";
    expect(firstOccurrence(r, "2026-10-12")).toBe("2027-01-15");
    expect(nextDueDate({ rule: r, mode: "fixed", dueDate: "2027-04-15", completedOn: "2027-04-10" })).toBe("2027-06-15");
  });
});

describe("describeRecurrence", () => {
  it.each([
    ["FREQ=MONTHLY;BYMONTHDAY=20", "fixed", "Monthly on the 20th"],
    ["FREQ=WEEKLY;INTERVAL=2;BYDAY=FR", "fixed", "Every other Friday"],
    ["FREQ=MONTHLY;INTERVAL=6", "after_completion", "Every 6 months, counted from when it's done"],
    ["FREQ=MONTHLY;INTERVAL=3", "fixed", "Quarterly"],
    ["FREQ=YEARLY;BYMONTH=1,4,6,9;BYMONTHDAY=15", "fixed", "Jan, Apr, Jun and Sep 15th"],
    ["FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", "fixed", "Every weekday"],
    ["FREQ=DAILY", "fixed", "Every day"],
  ] as const)("%s", (r, mode, text) => {
    expect(describeRecurrence(r, mode)).toBe(text);
  });
});
