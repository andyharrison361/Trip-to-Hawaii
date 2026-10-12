// Quick add: turn one line of text (typed or dictated) into a task draft.
//   "pay water bill friday"                    -> due Friday
//   "renew car registration Nov 3 #car"        -> due Nov 3, area Car
//   "pay credit card monthly on the 20th"      -> repeats monthly on the 20th
//   "oil change every 6 months after it's done @andy"
// Dictation-friendly: "hashtag car" works like "#car", "at sign allie" like "@allie".
// Runs identically in the browser (live preview) and on the server (API).

import * as chrono from "chrono-node";
import { firstOccurrence, parseRecurrence, type Recurrence } from "./recurrence";
import { pad, type ISODate } from "./dates";

export interface QuickAddArea {
  id: string;
  name: string;
  ownerId: string | null;
  keywords?: string[];
}

export interface QuickAddMember {
  id: string;
  name: string;
}

export interface QuickAddContext {
  areas: QuickAddArea[];
  members: QuickAddMember[];
  currentUserId: string;
  /** Current wall-clock time in the household timezone. */
  now: { year: number; month: number; day: number; hour: number; minute: number; date: ISODate };
}

export interface QuickAddDraft {
  title: string;
  dueDate: ISODate | null;
  dueTime: string | null;
  recurrence: Recurrence | null;
  areaId: string | null;
  areaMatchedBy: "tag" | "keyword" | null;
  assigneeId: string | null;
  assigneeMatchedBy: "mention" | "area-owner" | "default";
}

/** Normalize what iPhone dictation tends to produce. */
export function normalizeDictation(input: string): string {
  return input
    .replace(/\bhash\s*tag\s+/gi, "#")
    .replace(/\bhashtag/gi, "#")
    .replace(/#\s+(?=\w)/g, "#")
    .replace(/\bat\s+sign\s+/gi, "@")
    .replace(/@\s+(?=\w)/g, "@")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!]+$/, "");
}

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function words(s: string) {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** Find the best area for "#tag" plus up to three following words (for multi-word areas). */
function matchTag(tag: string, following: string[], areas: QuickAddArea[]) {
  let best: { area: QuickAddArea; consumed: number; score: number } | null = null;
  for (let take = Math.min(3, following.length); take >= 0; take--) {
    const phrase = compact([tag, ...following.slice(0, take)].join(""));
    if (!phrase) continue;
    for (const area of areas) {
      const name = compact(area.name);
      let score = 0;
      if (name === phrase) score = 100 + take;
      else if (take > 0 && name.startsWith(phrase)) score = 80 + take;
      else if (take === 0 && name.startsWith(phrase)) score = 60;
      else if (take === 0 && phrase.length >= 3 && words(area.name).some((w) => w.startsWith(phrase))) score = 40;
      else if (take === 0 && (area.keywords ?? []).some((k) => compact(k) === phrase)) score = 30;
      if (score && (!best || score > best.score)) best = { area, consumed: take, score };
    }
    if (best && best.score >= 80) break;
  }
  return best;
}

function matchKeyword(title: string, areas: QuickAddArea[]): QuickAddArea | null {
  const haystack = ` ${words(title).join(" ")} `;
  let best: { area: QuickAddArea; length: number } | null = null;
  for (const area of areas) {
    const candidates = [area.name, ...(area.keywords ?? [])];
    for (const k of candidates) {
      const needle = words(k).join(" ");
      if (needle.length < 3) continue;
      // match whole words, allowing a simple plural
      const re = new RegExp(` ${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s? `);
      if (re.test(haystack) && (!best || needle.length > best.length)) {
        best = { area, length: needle.length };
      }
    }
  }
  return best?.area ?? null;
}

function matchMember(name: string, ctx: QuickAddContext): QuickAddMember | null {
  const n = name.toLowerCase();
  if (n === "me" || n === "myself") return ctx.members.find((m) => m.id === ctx.currentUserId) ?? null;
  return (
    ctx.members.find((m) => m.name.toLowerCase().split(/\s+/)[0] === n) ??
    ctx.members.find((m) => n.length >= 2 && m.name.toLowerCase().startsWith(n)) ??
    null
  );
}

function cleanTitle(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  // Drop connecting words left dangling after removing dates ("pay bill by", "call vet on").
  const dangling = /(?:^|\s)(?:on|by|at|due|this|next|before|starting|from|until|in|and|,|-|–|—)\s*$/i;
  for (let i = 0; i < 4 && dangling.test(t); i++) t = t.replace(dangling, "").trim();
  t = t.replace(/^(?:[-–—,:]\s*)+/, "").replace(/\s+([,.;:!?])/g, "$1").replace(/[\s,;:–—-]+$/, "");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

export function parseQuickAdd(input: string, ctx: QuickAddContext): QuickAddDraft {
  let text = normalizeDictation(input);

  // Remove ranges from text, keeping indexes valid by removing right-to-left.
  const remove = (ranges: [number, number][]) => {
    for (const [start, end] of [...ranges].sort((a, b) => b[0] - a[0])) {
      text = `${text.slice(0, start)} ${text.slice(end)}`;
    }
  };

  // 1. #area tags (may span words: "#social calendar")
  let areaId: string | null = null;
  let areaMatchedBy: QuickAddDraft["areaMatchedBy"] = null;
  const tagRe = /#([a-z0-9][\w&'-]*)/i;
  const tagMatch = tagRe.exec(text);
  if (tagMatch) {
    const after = text.slice(tagMatch.index + tagMatch[0].length);
    const followingWords = after.trim() ? after.trim().split(/\s+/) : [];
    const found = matchTag(tagMatch[1], followingWords.map((w) => w.replace(/[^\w&'-]/g, "")), ctx.areas);
    let end = tagMatch.index + tagMatch[0].length;
    if (found) {
      areaId = found.area.id;
      areaMatchedBy = "tag";
      if (found.consumed > 0) {
        const re = new RegExp(`^\\s*(?:\\S+\\s*){${found.consumed}}`);
        const consumed = re.exec(after);
        if (consumed) end += consumed[0].length;
      }
    }
    remove([[tagMatch.index, end]]);
  }

  // 2. @person or "assign to Allie"
  let assigneeId: string | null = null;
  let assigneeMatchedBy: QuickAddDraft["assigneeMatchedBy"] = "default";
  const mention = /(?:@|\bassign(?:ed)?\s+to\s+)([a-z][\w'-]*)/i.exec(text);
  if (mention) {
    const member = matchMember(mention[1], ctx);
    if (member) {
      assigneeId = member.id;
      assigneeMatchedBy = "mention";
      remove([[mention.index, mention.index + mention[0].length]]);
    }
  }

  // 3. Repeats ("every month on the 20th")
  const rec = parseRecurrence(text);
  if (rec) remove(rec.ranges);

  // 4. Date and time (chrono). Reference "now" is the household's wall-clock time,
  //    expressed as a local Date so results don't depend on the device/server timezone.
  const { now } = ctx;
  const ref = new Date(now.year, now.month - 1, now.day, now.hour, now.minute);
  let dueDate: ISODate | null = null;
  let dueTime: string | null = null;
  const results = chrono.parse(text, ref, { forwardDate: true });
  // Ignore vague matches like "night" in "date night" or "March" in "March order":
  // require a definite day, weekday or time.
  const result = results.find(
    (r) =>
      !/^\d+$/.test(r.text.trim()) &&
      (r.start.isCertain("day") || r.start.isCertain("weekday") || r.start.isCertain("hour")),
  );
  if (result) {
    const s = result.start;
    dueDate = `${s.get("year")}-${pad(s.get("month")!)}-${pad(s.get("day")!)}`;
    if (s.isCertain("hour")) dueTime = `${pad(s.get("hour")!)}:${pad(s.get("minute") ?? 0)}`;
    remove([[result.index, result.index + result.text.length]]);
  }

  if (rec && !dueDate) {
    dueDate = firstOccurrence(rec.recurrence.rule, now.date);
  }

  const title = cleanTitle(text);

  // 5. Area by keyword if no explicit tag ("heartworm pill" -> Dog)
  if (!areaId) {
    const area = matchKeyword(title, ctx.areas);
    if (area) {
      areaId = area.id;
      areaMatchedBy = "keyword";
    }
  }

  // 6. Default assignee: the area's owner, otherwise whoever is adding it.
  // An area still waiting for the invited partner leaves the task unassigned;
  // it's handed to them when they join.
  if (!assigneeId) {
    const area = ctx.areas.find((a) => a.id === areaId);
    if (area) {
      assigneeId = area.ownerId;
      assigneeMatchedBy = "area-owner";
    } else {
      assigneeId = ctx.currentUserId;
    }
  }

  return {
    title,
    dueDate,
    dueTime,
    recurrence: rec?.recurrence ?? null,
    areaId,
    areaMatchedBy,
    assigneeId,
    assigneeMatchedBy,
  };
}
