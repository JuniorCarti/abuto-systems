import assert from "node:assert/strict";
import test from "node:test";
import { calculateAskanPharmaPricing, formatKes } from "../lib/askanpharma-pricing.ts";
import { validateLead } from "../lib/lead-validation.ts";

test("monthly and annual device totals match approved prices for one to five devices", () => {
  const monthly = [1_500, 2_000, 2_500, 3_000, 3_500];
  const annual = [15_000, 20_000, 25_000, 30_000, 35_000];
  for (let devices = 1; devices <= 5; devices += 1) {
    const price = calculateAskanPharmaPricing(devices);
    assert.equal(price?.monthlyTotal, monthly[devices - 1]);
    assert.equal(price?.annualTotal, annual[devices - 1]);
  }
});

test("onboarding is free through three devices and charged once per device above three", () => {
  const onboarding = [0, 0, 0, 500, 1_000, 1_500];
  for (let devices = 1; devices <= 6; devices += 1) {
    assert.equal(calculateAskanPharmaPricing(devices)?.onboardingTotal, onboarding[devices - 1]);
  }
});

test("annual savings compare the selected annual price with twelve monthly payments", () => {
  assert.equal(calculateAskanPharmaPricing(1)?.annualSavingsVsMonthly, 3_000);
  assert.equal(calculateAskanPharmaPricing(5)?.annualSavingsVsMonthly, 7_000);
  assert.equal(formatKes(1_500), "KES 1,500");
});

test("pricing rejects non-integer, invalid, unsafe, and out-of-range device counts", () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "3", null, 10_001]) {
    assert.equal(calculateAskanPharmaPricing(value), null, `reject ${String(value)}`);
  }
});

test("large device counts within the supported range remain safe", () => {
  assert.deepEqual(calculateAskanPharmaPricing(10_000), {
    devices: 10_000,
    monthlyTotal: 5_001_000,
    annualTotal: 50_010_000,
    annualSavingsVsMonthly: 10_002_000,
    onboardingTotal: 4_998_500,
  });
});

test("trial request uses the existing inquiry record with validated business context", () => {
  const result = validateLead({
    kind: "trial",
    name: "Pharmacy Owner",
    organization: "Example Pharmacy",
    email: "OWNER@example.com",
    town: "Eldoret",
    interest: "tampered value is ignored",
  });
  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.lead.kind, "inquiry");
  assert.equal(result.lead.interest, "AskanPharma trial request");
  assert.equal(result.lead.email, "owner@example.com");
  assert.equal(result.lead.message, "21-day AskanPharma trial setup request.");
  assert.equal(result.lead.preferredDate, "");
});

test("trial request requires the pharmacy or business name and valid contact details", () => {
  const result = validateLead({ kind: "trial", name: "Owner", organization: "", email: "not-an-email" });
  assert.equal(result.valid, false);
  if (result.valid) return;
  assert.ok(result.errors.organization);
  assert.ok(result.errors.email);
});

test("trial intent does not change generic inquiries or demo validation", () => {
  const inquiry = validateLead({ kind: "inquiry", name: "Owner", email: "owner@example.com", message: "A detailed general enquiry." });
  assert.equal(inquiry.valid, true);
  if (inquiry.valid) assert.equal(inquiry.lead.kind, "inquiry");

  const demo = validateLead({ kind: "demo", name: "Owner", organization: "Example Pharmacy", email: "owner@example.com", phone: "+254700000000" });
  assert.equal(demo.valid, false);
  if (!demo.valid) assert.ok(demo.errors.preferredDate);
});
