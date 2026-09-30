import test from "node:test";
import assert from "node:assert/strict";
import { validateDemoSlot } from "../lib/business-hours.ts";
import { validateLead } from "../lib/lead-validation.ts";

const now = new Date("2026-09-28T09:00:00.000Z"); // 12:00 EAT, Monday

test("weekday demo boundaries are accepted in Nairobi time", () => {
  assert.deepEqual(validateDemoSlot("2026-09-29", "08:00", now), { valid: true });
  assert.deepEqual(validateDemoSlot("2026-09-29", "18:00", now), { valid: true });
});

test("weekday times outside business hours are rejected", () => {
  assert.equal(validateDemoSlot("2026-09-29", "07:59", now).valid, false);
  assert.equal(validateDemoSlot("2026-09-29", "18:01", now).valid, false);
});

test("Saturday boundaries are accepted and outside hours are rejected", () => {
  assert.deepEqual(validateDemoSlot("2026-10-03", "09:00", now), { valid: true });
  assert.deepEqual(validateDemoSlot("2026-10-03", "16:00", now), { valid: true });
  assert.equal(validateDemoSlot("2026-10-03", "08:59", now).valid, false);
  assert.equal(validateDemoSlot("2026-10-03", "16:01", now).valid, false);
});

test("Sunday, past dates, past same-day times, and malformed dates are rejected", () => {
  assert.equal(validateDemoSlot("2026-10-04", "10:00", now).valid, false);
  assert.equal(validateDemoSlot("2026-09-27", "10:00", now).valid, false);
  assert.equal(validateDemoSlot("2026-09-28", "11:59", now).valid, false);
  assert.equal(validateDemoSlot("2026-02-30", "10:00", now).valid, false);
});

test("slot interpretation is independent of the visitor's UTC instant", () => {
  const beforeUtcMidnight = new Date("2026-09-28T20:00:00.000Z"); // 23:00 EAT
  assert.equal(validateDemoSlot("2026-09-29", "08:00", beforeUtcMidnight).valid, true);
  assert.equal(validateDemoSlot("2026-09-28", "22:00", beforeUtcMidnight).valid, false);
});

test("demo request fields and business-hour validation run on the server rules", () => {
  const base = {
    kind: "demo", name: "Jamie Test", organization: "Green Pharmacy", email: "Jamie@example.com",
    phone: "+254700000000", preferredDate: "2026-09-29", preferredTime: "09:00",
    preferredContact: "WhatsApp", branches: "2", message: "Please cover stock management.",
  };
  const result = validateLead(base, now);
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.lead.email, "jamie@example.com");
    assert.equal(result.lead.branches, 2);
  }
  assert.equal(validateLead({ ...base, preferredDate: "2026-10-04" }, now).valid, false);
  assert.equal(validateLead({ ...base, preferredContact: "Signal" }, now).valid, false);
  assert.equal(validateLead({ ...base, name: "x".repeat(121) }, now).valid, false);
});
