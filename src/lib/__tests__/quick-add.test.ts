import { describe, expect, it } from "vitest";
import { normalizeDictation, parseQuickAdd, type QuickAddContext } from "../quick-add";

const ANDY = "u-andy";
const ALLIE = "u-allie";

// Monday, Oct 12 2026, 9:00am Central
const ctx: QuickAddContext = {
  currentUserId: ANDY,
  now: { year: 2026, month: 10, day: 12, hour: 9, minute: 0, date: "2026-10-12" },
  members: [
    { id: ANDY, name: "Andy Harrison" },
    { id: ALLIE, name: "Allie Harrison" },
  ],
  areas: [
    { id: "a-car", name: "Car", ownerId: ANDY, keywords: ["oil change", "registration", "tires"] },
    { id: "a-dog", name: "Dog", ownerId: ANDY, keywords: ["heartworm", "vet", "dog food"] },
    { id: "a-fin", name: "Finances", ownerId: ANDY, keywords: ["bill", "credit card"] },
    { id: "a-social", name: "Social Calendar", ownerId: ALLIE, keywords: ["party", "dinner with"] },
    { id: "a-travel", name: "Travel", ownerId: ALLIE, keywords: ["flight", "hotel", "trip"] },
    { id: "a-pending", name: "Gifts", ownerId: null, keywords: ["gift"] },
  ],
};

describe("parseQuickAdd", () => {
  it("parses a weekday", () => {
    const d = parseQuickAdd("pay water bill friday", ctx);
    expect(d.title).toBe("Pay water bill");
    expect(d.dueDate).toBe("2026-10-16");
    expect(d.dueTime).toBeNull();
    expect(d.areaId).toBe("a-fin");
    expect(d.areaMatchedBy).toBe("keyword");
    expect(d.assigneeId).toBe(ANDY);
  });

  it("parses a month/day and a #tag", () => {
    const d = parseQuickAdd("renew car registration Nov 3 #car", ctx);
    expect(d.title).toBe("Renew car registration");
    expect(d.dueDate).toBe("2026-11-03");
    expect(d.areaId).toBe("a-car");
    expect(d.areaMatchedBy).toBe("tag");
  });

  it("handles dictation: 'hashtag', capitalisation and trailing period", () => {
    const d = parseQuickAdd("Book flights for Christmas hashtag travel.", ctx);
    expect(d.areaId).toBe("a-travel");
    expect(d.assigneeId).toBe(ALLIE);
    expect(d.title).toMatch(/^Book flights/);
  });

  it("matches multi-word area tags", () => {
    const d = parseQuickAdd("RSVP to the wedding #social calendar", ctx);
    expect(d.areaId).toBe("a-social");
    expect(d.title).toBe("RSVP to the wedding");
  });

  it("parses times", () => {
    const d = parseQuickAdd("call the vet tomorrow at 3pm", ctx);
    expect(d.dueDate).toBe("2026-10-13");
    expect(d.dueTime).toBe("15:00");
    expect(d.title).toBe("Call the vet");
    expect(d.areaId).toBe("a-dog");
  });

  it("parses monthly on the 20th", () => {
    const d = parseQuickAdd("Pay credit card monthly on the 20th", ctx);
    expect(d.title).toBe("Pay credit card");
    expect(d.recurrence).toEqual({ rule: "FREQ=MONTHLY;BYMONTHDAY=20", mode: "fixed" });
    expect(d.dueDate).toBe("2026-10-20");
  });

  it("parses 'every 6 months after it's done'", () => {
    const d = parseQuickAdd("oil change every 6 months after it's done", ctx);
    expect(d.title).toBe("Oil change");
    expect(d.recurrence).toEqual({ rule: "FREQ=MONTHLY;INTERVAL=6", mode: "after_completion" });
    expect(d.areaId).toBe("a-car");
  });

  it("parses every other friday", () => {
    const d = parseQuickAdd("date night every other friday", ctx);
    expect(d.recurrence?.rule).toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=FR");
    expect(d.dueDate).toBe("2026-10-16");
    expect(d.title).toBe("Date night");
  });

  it("parses mentions and dictated mentions", () => {
    expect(parseQuickAdd("order cushion fabric @allie", ctx).assigneeId).toBe(ALLIE);
    expect(parseQuickAdd("order cushion fabric at sign Allie", ctx).assigneeId).toBe(ALLIE);
    expect(parseQuickAdd("order cushion fabric assign to allie", ctx).title).toBe("Order cushion fabric");
  });

  it("does not assign just because a name appears", () => {
    const d = parseQuickAdd("buy flowers for Allie saturday", ctx);
    expect(d.assigneeId).toBe(ANDY);
    expect(d.title).toBe("Buy flowers for Allie");
  });

  it("leaves tasks in a pending partner's area unassigned", () => {
    const d = parseQuickAdd("wrap mom's birthday gift", ctx);
    expect(d.areaId).toBe("a-pending");
    expect(d.assigneeId).toBeNull();
  });

  it("keeps plain titles intact", () => {
    const d = parseQuickAdd("we're out of coffee", ctx);
    expect(d.title).toBe("We're out of coffee");
    expect(d.dueDate).toBeNull();
    expect(d.areaId).toBeNull();
    expect(d.assigneeId).toBe(ANDY);
  });

  it("parses quarterly with a start date", () => {
    const d = parseQuickAdd("business taxes quarterly starting Jan 15", ctx);
    expect(d.recurrence?.rule).toBe("FREQ=MONTHLY;INTERVAL=3");
    expect(d.dueDate).toBe("2027-01-15");
    expect(d.title).toBe("Business taxes");
  });

  it("parses 'next week' and 'in 3 days'", () => {
    expect(parseQuickAdd("clean gutters in 3 days", ctx).dueDate).toBe("2026-10-15");
    expect(parseQuickAdd("schedule vet next tuesday", ctx).dueDate).toBe("2026-10-20");
  });
});

describe("normalizeDictation", () => {
  it("turns spoken symbols into symbols", () => {
    expect(normalizeDictation("Feed dog hashtag dog.")).toBe("Feed dog #dog");
    expect(normalizeDictation("call vet # dog")).toBe("call vet #dog");
  });
});

describe("vague dates", () => {
  it("ignores bare month names and parts of day", () => {
    expect(parseQuickAdd("sew cushions for March order", ctx).dueDate).toBeNull();
    expect(parseQuickAdd("plan date night", ctx).dueDate).toBeNull();
    expect(parseQuickAdd("pick up dog food tonight", ctx).dueDate).toBe("2026-10-12");
  });
});
