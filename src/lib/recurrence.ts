// Repeating tasks. Rules are stored as RFC 5545 RRULE bodies (e.g.
// "FREQ=MONTHLY;BYMONTHDAY=20") so they stay portable to Google Calendar and any
// future native app. This file turns everyday phrases into rules, describes
// rules in plain English, and works out the next due date.

import { RRule, type Options } from "rrule";
import { addDays, fromUTCDate, toUTCDate, type ISODate } from "./dates";

export type RecurrenceMode = "fixed" | "after_completion";

export interface Recurrence {
  rule: string;
  mode: RecurrenceMode;
}

// ---------------------------------------------------------------------------
// Computing occurrences
// ---------------------------------------------------------------------------

function buildRule(rule: string, dtstart: ISODate): RRule {
  const options = RRule.parseString(rule);
  return new RRule({ ...options, dtstart: toUTCDate(dtstart) } as Partial<Options>);
}

export function isValidRule(rule: string): boolean {
  try {
    const opts = RRule.parseString(rule);
    return opts.freq !== undefined;
  } catch {
    return false;
  }
}

/** First occurrence on or after `from`, anchoring the rule at `from`. */
export function firstOccurrence(rule: string, from: ISODate): ISODate | null {
  const next = buildRule(rule, from).after(toUTCDate(from), true);
  return next ? fromUTCDate(next) : null;
}

/**
 * When a repeating task is completed, when is the next one due?
 *  - fixed: the next scheduled date after the current due date ("monthly on the 20th").
 *    If we've fallen behind, skip ahead to the next date that isn't already past.
 *  - after_completion: counted from the day it was actually done ("6 months after the last oil change").
 */
export function nextDueDate(args: {
  rule: string;
  mode: RecurrenceMode;
  dueDate: ISODate | null;
  completedOn: ISODate;
}): ISODate | null {
  const { rule, mode, dueDate, completedOn } = args;
  if (mode === "after_completion" || !dueDate) {
    const r = buildRule(rule, completedOn);
    const next = r.after(toUTCDate(completedOn), false);
    return next ? fromUTCDate(next) : null;
  }

  const r = buildRule(rule, dueDate);
  let next = r.after(toUTCDate(dueDate), false);
  const floor = toUTCDate(completedOn);
  for (let i = 0; next && next < floor && i < 1000; i++) {
    next = r.after(next, false);
  }
  return next ? fromUTCDate(next) : null;
}

/** Upcoming dates for a rule, for previews ("next: Oct 20, Nov 20, Dec 20"). */
export function upcomingOccurrences(rule: string, from: ISODate, count = 3): ISODate[] {
  const r = buildRule(rule, from);
  const out: ISODate[] = [];
  let cursor: Date | null = toUTCDate(addDays(from, -1));
  while (out.length < count && cursor) {
    cursor = r.after(cursor, false);
    if (cursor) out.push(fromUTCDate(cursor));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Describing rules
// ---------------------------------------------------------------------------

const DAY_NAMES: Record<string, string> = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
};
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  if (n === -1) return "last day";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function parseRuleParts(rule: string): Record<string, string> {
  return Object.fromEntries(
    rule
      .replace(/^RRULE:/i, "")
      .split(";")
      .filter(Boolean)
      .map((p) => {
        const [k, v] = p.split("=");
        return [k.toUpperCase(), v];
      }),
  );
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function describeRecurrence(rule: string, mode: RecurrenceMode = "fixed"): string {
  const p = parseRuleParts(rule);
  const interval = Number(p.INTERVAL ?? 1);
  const byDay = p.BYDAY?.split(",") ?? [];
  const byMonthDay = p.BYMONTHDAY?.split(",").map(Number) ?? [];
  const byMonth = p.BYMONTH?.split(",").map(Number) ?? [];
  const lastDay = p.BYSETPOS === "-1" && byMonthDay.includes(31);
  let text: string;

  switch (p.FREQ) {
    case "DAILY":
      text = interval === 1 ? "Every day" : `Every ${interval} days`;
      break;
    case "WEEKLY": {
      const isWeekdays = byDay.length === 5 && ["MO", "TU", "WE", "TH", "FR"].every((d) => byDay.includes(d));
      const isWeekend = byDay.length === 2 && byDay.includes("SA") && byDay.includes("SU");
      const base = interval === 1 ? "Every" : interval === 2 ? "Every other" : `Every ${interval} weeks on`;
      if (isWeekdays && interval === 1) text = "Every weekday";
      else if (isWeekend && interval === 1) text = "Every weekend";
      else if (byDay.length) text = `${base} ${joinList(byDay.map((d) => DAY_NAMES[d] ?? d))}`;
      else text = interval === 1 ? "Every week" : interval === 2 ? "Every other week" : `Every ${interval} weeks`;
      break;
    }
    case "MONTHLY": {
      const base =
        interval === 1 ? "Monthly" : interval === 3 ? "Every 3 months" : `Every ${interval} months`;
      if (lastDay || (byMonthDay.length === 1 && byMonthDay[0] === -1)) text = `${base} on the last day`;
      else if (byMonthDay.length) text = `${base} on the ${joinList(byMonthDay.map(ordinal))}`;
      else text = interval === 3 ? "Quarterly" : base;
      break;
    }
    case "YEARLY": {
      if (byMonth.length && byMonthDay.length === 1) {
        const months = byMonth.map((m) => MONTH_NAMES[m - 1].slice(0, 3));
        text = byMonth.length === 1
          ? `Every year on ${MONTH_NAMES[byMonth[0] - 1]} ${byMonthDay[0]}`
          : `${joinList(months)} ${ordinal(byMonthDay[0])}`;
      } else {
        text = interval === 1 ? "Every year" : `Every ${interval} years`;
      }
      break;
    }
    default:
      try {
        text = RRule.fromString(rule).toText();
        text = text.charAt(0).toUpperCase() + text.slice(1);
      } catch {
        text = "Repeats";
      }
  }
  return mode === "after_completion" ? `${text}, counted from when it's done` : text;
}

// ---------------------------------------------------------------------------
// Parsing everyday phrases ("every month on the 20th", "every other friday")
// ---------------------------------------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, other: 2,
};
const NUM = "(?:\\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|other)";
const DAY =
  "(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues|tue|wed|thurs|thur|thu|fri|sat|sun)s?";
const DAYLIST = `${DAY}(?:\\s*(?:,\\s*and|,|and|&)\\s*${DAY})*`;
const NTH = "(\\d{1,2})(?:st|nd|rd|th)?";
const ON_TAIL = `(?:\\s+on\\s+(?:the\\s+)?(?:${NTH}|(last\\s+day))|\\s+on\\s+(${DAYLIST}))?`;

const DAY_CODES: [RegExp, string][] = [
  [/^mon/, "MO"], [/^tue/, "TU"], [/^wed/, "WE"], [/^thu/, "TH"],
  [/^fri/, "FR"], [/^sat/, "SA"], [/^sun/, "SU"],
];

function dayCodes(list: string): string[] {
  const words = list.toLowerCase().split(/[\s,&]+|\band\b/).filter(Boolean);
  const codes: string[] = [];
  for (const w of words) {
    const found = DAY_CODES.find(([re]) => re.test(w));
    if (found && !codes.includes(found[1])) codes.push(found[1]);
  }
  return codes;
}

function toNumber(word: string | undefined): number {
  if (!word) return 1;
  const w = word.toLowerCase();
  return NUMBER_WORDS[w] ?? Math.max(1, Number(w) || 1);
}

function monthDayPart(day: number): string {
  if (day >= 31) return "BYMONTHDAY=28,29,30,31;BYSETPOS=-1";
  return `BYMONTHDAY=${day}`;
}

function applyTail(base: string, freq: string, nth?: string, last?: string, days?: string): string {
  const parts = [base];
  if (last) parts.push(freq === "MONTHLY" ? "BYMONTHDAY=28,29,30,31;BYSETPOS=-1" : "");
  else if (nth && freq === "MONTHLY") {
    const d = Number(nth);
    if (d >= 1 && d <= 31) parts.push(monthDayPart(d));
  } else if (days) {
    const codes = dayCodes(days);
    if (codes.length) parts.push(`BYDAY=${codes.join(",")}`);
  }
  return parts.filter(Boolean).join(";");
}

export interface RecurrenceMatch {
  recurrence: Recurrence;
  /** Character ranges in the input that described the recurrence. */
  ranges: [number, number][];
}

type Matcher = (text: string) => { rule: string; range: [number, number] } | null;

const MATCHERS: Matcher[] = [
  // "on the 20th of every month"
  (text) => {
    const m = new RegExp(`\\b(?:on\\s+)?the\\s+${NTH}\\s+of\\s+(?:every|each|the)\\s+month\\b`, "i").exec(text);
    if (!m) return null;
    return { rule: `FREQ=MONTHLY;${monthDayPart(Number(m[1]))}`, range: [m.index, m.index + m[0].length] };
  },
  // "every 20th (of the month)"
  (text) => {
    const m = new RegExp(`\\b(?:every|each)\\s+(\\d{1,2})(?:st|nd|rd|th)(?:\\s+of\\s+(?:the|every|each)\\s+month)?\\b`, "i").exec(text);
    if (!m) return null;
    return { rule: `FREQ=MONTHLY;${monthDayPart(Number(m[1]))}`, range: [m.index, m.index + m[0].length] };
  },
  // "every weekday", "every weekend"
  (text) => {
    const m = /\b(?:every|each)\s+(weekday|weekend)s?\b/i.exec(text);
    if (!m) return null;
    const byday = m[1].toLowerCase() === "weekday" ? "MO,TU,WE,TH,FR" : "SA,SU";
    return { rule: `FREQ=WEEKLY;BYDAY=${byday}`, range: [m.index, m.index + m[0].length] };
  },
  // "every 6 months", "every other week on friday", "every month on the 20th", "every quarter"
  (text) => {
    const m = new RegExp(`\\b(?:every|each)\\s+(?:(${NUM})\\s+)?(day|week|month|year|quarter)s?\\b${ON_TAIL}`, "i").exec(text);
    if (!m) return null;
    let n = toNumber(m[1]);
    let unit = m[2].toLowerCase();
    if (unit === "quarter") {
      unit = "month";
      n *= 3;
    }
    const freq = { day: "DAILY", week: "WEEKLY", month: "MONTHLY", year: "YEARLY" }[unit]!;
    const base = n > 1 ? `FREQ=${freq};INTERVAL=${n}` : `FREQ=${freq}`;
    return { rule: applyTail(base, freq, m[3], m[4], m[5]), range: [m.index, m.index + m[0].length] };
  },
  // "monthly on the 20th", "weekly", "quarterly", "biweekly", "annually"
  (text) => {
    const m = new RegExp(`\\b(daily|weekly|bi-?weekly|fortnightly|monthly|bi-?monthly|quarterly|yearly|annually)\\b${ON_TAIL}`, "i").exec(text);
    if (!m) return null;
    const word = m[1].toLowerCase().replace("-", "");
    const map: Record<string, [string, number]> = {
      daily: ["DAILY", 1],
      weekly: ["WEEKLY", 1],
      biweekly: ["WEEKLY", 2],
      fortnightly: ["WEEKLY", 2],
      monthly: ["MONTHLY", 1],
      bimonthly: ["MONTHLY", 2],
      quarterly: ["MONTHLY", 3],
      yearly: ["YEARLY", 1],
      annually: ["YEARLY", 1],
    };
    const [freq, n] = map[word];
    const base = n > 1 ? `FREQ=${freq};INTERVAL=${n}` : `FREQ=${freq}`;
    return { rule: applyTail(base, freq, m[2], m[3], m[4]), range: [m.index, m.index + m[0].length] };
  },
  // "every monday and thursday", "every other friday"
  (text) => {
    const m = new RegExp(`\\b(?:every|each)\\s+(other\\s+)?(${DAYLIST})\\b`, "i").exec(text);
    if (!m) return null;
    const codes = dayCodes(m[2]);
    if (!codes.length) return null;
    const base = m[1] ? "FREQ=WEEKLY;INTERVAL=2" : "FREQ=WEEKLY";
    return { rule: `${base};BYDAY=${codes.join(",")}`, range: [m.index, m.index + m[0].length] };
  },
];

const AFTER_COMPLETION =
  /\b(?:(?:counted\s+)?from\s+(?:when\s+(?:it'?s|it\s+is|i'?m|we'?re)\s+)?(?:done|completed?|completion|finished)|after\s+(?:it'?s\s+|it\s+is\s+)?(?:done|completed?|completion|finished))\b/i;

export function parseRecurrence(text: string): RecurrenceMatch | null {
  for (const matcher of MATCHERS) {
    const found = matcher(text);
    if (!found) continue;
    const ranges: [number, number][] = [found.range];
    let mode: RecurrenceMode = "fixed";
    const after = AFTER_COMPLETION.exec(text);
    if (after) {
      mode = "after_completion";
      ranges.push([after.index, after.index + after[0].length]);
    }
    return { recurrence: { rule: found.rule, mode }, ranges };
  }
  return null;
}
