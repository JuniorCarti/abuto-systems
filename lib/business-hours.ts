import { company } from "../data/company.ts";

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timePattern = /^(\d{2}):(\d{2})$/;

export type DemoSlotResult = { valid: true } | { valid: false; reason: string };

function dateParts(value: string) {
  const match = datePattern.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day, weekday: date.getUTCDay() };
}

function nairobiDateTime(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: company.timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

export function validateDemoSlot(date: string, time: string, now = new Date()): DemoSlotResult {
  const parsedDate = dateParts(date);
  if (!parsedDate) return { valid: false, reason: "Choose a valid preferred demo date." };
  const parsedTime = timePattern.exec(time);
  if (!parsedTime || Number(parsedTime[1]) > 23 || Number(parsedTime[2]) > 59) {
    return { valid: false, reason: "Choose a valid preferred demo time." };
  }

  const { date: today, time: currentTime } = nairobiDateTime(now);
  if (date < today || (date === today && time < currentTime)) {
    return { valid: false, reason: "Choose a date and time that has not passed in Nairobi." };
  }
  if (parsedDate.weekday === 0) return { valid: false, reason: "Virtual demos are not available on Sundays." };

  const hours = parsedDate.weekday === 6 ? company.businessHours.saturday : company.businessHours.weekdays;
  if (time < hours.opens || time > hours.closes) {
    return { valid: false, reason: parsedDate.weekday === 6
      ? "Saturday preferred times must be between 9:00 AM and 4:00 PM EAT."
      : "Weekday preferred times must be between 8:00 AM and 6:00 PM EAT." };
  }
  return { valid: true };
}

export function getNairobiDate(now = new Date()) {
  return nairobiDateTime(now).date;
}
