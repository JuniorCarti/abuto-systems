import { nairobiDateTime, validateDemoSlot } from "./business-hours.ts";

export const schedulingTimeZone = "Africa/Nairobi";
export const demoDurationMinutes = 30;

export type DemoSlot = {
  start: string;
  end: string;
  time: string;
  label: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function validDate(date: string) {
  if (!datePattern.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}

function weekday(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function localDateTimeToInstant(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: schedulingTimeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  let instant = wanted;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const correction = wanted - represented;
    instant += correction;
    if (correction === 0) break;
  }
  return new Date(instant);
}

function displayTime(time: string) {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"} EAT`;
}

export function getDemoSlotsForDate(date: string, now = new Date()): DemoSlot[] {
  if (!validDate(date)) return [];
  const day = weekday(date);
  if (day === 0) return [];
  const opening = day === 6 ? 9 * 60 : 8 * 60;
  const closing = day === 6 ? 16 * 60 : 18 * 60;
  const slots: DemoSlot[] = [];

  for (let startMinute = opening; startMinute + demoDurationMinutes <= closing; startMinute += demoDurationMinutes) {
    const startTime = `${String(Math.floor(startMinute / 60)).padStart(2, "0")}:${String(startMinute % 60).padStart(2, "0")}`;
    if (!validateDemoSlot(date, startTime, now).valid) continue;
    const start = localDateTimeToInstant(date, startTime);
    if (start.getTime() <= now.getTime()) continue;
    const end = new Date(start.getTime() + demoDurationMinutes * 60_000);
    slots.push({ start: start.toISOString(), end: end.toISOString(), time: startTime, label: displayTime(startTime) });
  }
  return slots;
}

export function validateAvailabilityDate(date: unknown, now = new Date()) {
  if (typeof date !== "string" || !validDate(date)) return "Choose a valid demo date.";
  if (date < nairobiDateTime(now).date) return "Choose a date that has not passed in Nairobi.";
  if (weekday(date) === 0) return "Virtual demos are not available on Sundays.";
  return null;
}

export function filterBusySlots(slots: DemoSlot[], busy: Array<{ start: string; end: string }>) {
  const ranges = busy.flatMap(range => {
    const start = Date.parse(range.start);
    const end = Date.parse(range.end);
    return Number.isFinite(start) && Number.isFinite(end) && end > start ? [[start, end] as const] : [];
  });
  return slots.filter(slot => {
    const start = Date.parse(slot.start);
    const end = Date.parse(slot.end);
    return !ranges.some(([busyStart, busyEnd]) => start < busyEnd && end > busyStart);
  });
}

export function validateRequestedSlot(date: unknown, time: unknown, now = new Date()) {
  if (typeof date !== "string" || !validDate(date) || typeof time !== "string" || !timePattern.test(time)) return null;
  const slot = getDemoSlotsForDate(date, now).find(candidate => candidate.time === time);
  return slot ?? null;
}

export function formatSlotInNairobi(startAt: string, endAt: string) {
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: schedulingTimeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(startAt));
  const timeOptions: Intl.DateTimeFormatOptions = { timeZone: schedulingTimeZone, hour: "numeric", minute: "2-digit", hour12: true };
  const start = new Intl.DateTimeFormat("en-KE", timeOptions).format(new Date(startAt));
  const end = new Intl.DateTimeFormat("en-KE", timeOptions).format(new Date(endAt));
  return { date, start, end };
}
