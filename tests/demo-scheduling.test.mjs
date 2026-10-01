import test from "node:test";
import assert from "node:assert/strict";
import { filterBusySlots, getDemoSlotsForDate, validateAvailabilityDate, validateRequestedSlot } from "../lib/demo-scheduling.ts";

const middayMonday = new Date("2026-09-28T09:00:00.000Z"); // Monday, 12:00 in Nairobi.

test("weekday demo slots are 30 minutes and fit within Nairobi service hours", () => {
  const slots = getDemoSlotsForDate("2026-09-28", middayMonday);
  assert.equal(slots[0].time, "12:30");
  assert.equal(slots.at(-1).time, "17:30");
  assert.equal(slots.some(slot => slot.time === "18:00"), false);
  assert.ok(slots.every(slot => Date.parse(slot.end) - Date.parse(slot.start) === 30 * 60_000));
  assert.equal(validateRequestedSlot("2026-09-28", "17:30", middayMonday)?.time, "17:30");
  assert.equal(validateRequestedSlot("2026-09-28", "18:00", middayMonday), null);
});

test("a slot that has already started is excluded even when the current minute is exact", () => {
  const justAfterTen = new Date("2026-10-05T07:00:30.000Z"); // 10:00:30 EAT.
  const slots = getDemoSlotsForDate("2026-10-05", justAfterTen);
  assert.equal(slots.some(slot => slot.time === "10:00"), false);
  assert.equal(slots.some(slot => slot.time === "10:30"), true);
});

test("Saturday slots start at 09:00 and last no later than 16:00 EAT", () => {
  const slots = getDemoSlotsForDate("2026-10-03", middayMonday);
  assert.equal(slots[0].time, "09:00");
  assert.equal(slots.at(-1).time, "15:30");
  assert.equal(slots.some(slot => slot.time === "16:00"), false);
});

test("availability rejects malformed, past, and Sunday dates", () => {
  assert.ok(validateAvailabilityDate("2026-02-30", middayMonday));
  assert.ok(validateAvailabilityDate("2026-09-27", middayMonday));
  assert.ok(validateAvailabilityDate("2026-10-04", middayMonday));
  assert.equal(getDemoSlotsForDate("2026-10-04", middayMonday).length, 0);
});

test("busy interval overlap is half-open and does not block adjacent slots", () => {
  const slots = getDemoSlotsForDate("2026-10-05", middayMonday).slice(0, 2);
  const adjacentBusy = [{ start: "2026-10-05T04:00:00.000Z", end: slots[0].start }];
  assert.deepEqual(filterBusySlots(slots, adjacentBusy).map(slot => slot.time), ["08:00", "08:30"]);
  const overlap = [{ start: "2026-10-05T05:15:00.000Z", end: "2026-10-05T05:30:00.000Z" }];
  assert.deepEqual(filterBusySlots(slots, overlap).map(slot => slot.time), ["08:30"]);
});

test("EAT interpretation is independent of a browser timezone", () => {
  const slot = validateRequestedSlot("2026-10-05", "08:00", new Date("2026-10-01T09:00:00.000Z"));
  assert.equal(slot.start, "2026-10-05T05:00:00.000Z");
  assert.equal(slot.end, "2026-10-05T05:30:00.000Z");
});
