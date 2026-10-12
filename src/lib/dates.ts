// Calendar-date helpers. Task dates are plain local dates ("YYYY-MM-DD") and
// times ("HH:MM") in the household's timezone, so we avoid timezone math
// everywhere except when asking "what day is it right now?".

export type ISODate = string; // YYYY-MM-DD

export const DEFAULT_TIMEZONE = "America/Chicago";

export function nowInTimeZone(timeZone: string = DEFAULT_TIMEZONE, at: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  return {
    year,
    month,
    day,
    hour,
    minute,
    date: `${year}-${pad(month)}-${pad(day)}` as ISODate,
    time: `${pad(hour)}:${pad(minute)}`,
  };
}

export function todayIn(timeZone: string = DEFAULT_TIMEZONE): ISODate {
  return nowInTimeZone(timeZone).date;
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** "2026-10-20" -> Date at UTC midnight (used for date arithmetic only). */
export function toUTCDate(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fromUTCDate(date: Date): ISODate {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = toUTCDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTCDate(d);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTCDate(to).getTime() - toUTCDate(from).getTime()) / 86_400_000);
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromUTCDate(toUTCDate(value)) === value;
}

export function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

/** "14:30" or "14:30:00" -> "2:30 PM" */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${pad(m)} ${suffix}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function weekdayOf(date: ISODate): number {
  return toUTCDate(date).getUTCDay();
}

export function formatShortDate(date: ISODate): string {
  const d = toUTCDate(date);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatLongDate(date: ISODate): string {
  const d = toUTCDate(date);
  return `${WEEKDAYS_LONG[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Friendly relative label: "Today", "Tomorrow", "Fri", "Oct 20", "Yesterday", "3 days ago". */
export function formatRelativeDate(date: ISODate, today: ISODate): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < -1 && diff > -14) return `${-diff} days ago`;
  if (diff > 1 && diff < 7) return WEEKDAYS[weekdayOf(date)];
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return sameYear ? formatShortDate(date) : `${formatShortDate(date)}, ${date.slice(0, 4)}`;
}

export function formatDue(date: ISODate | null, time: string | null, today: ISODate): string {
  if (!date) return time ? formatTime(time) : "";
  const rel = formatRelativeDate(date, today);
  return time ? `${rel} · ${formatTime(time)}` : rel;
}

/** Monday of the week containing `date`. Weekly reviews key off this. */
export function startOfWeek(date: ISODate): ISODate {
  const wd = weekdayOf(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}
