import assert from "node:assert/strict";
import test from "node:test";
import { buildLeadNotification, leadNotificationDestination, leadNotificationFrom, leadNotificationSender, sendLeadNotification, storeLeadAndNotify } from "../lib/lead-notification.ts";

const baseLead = {
  id: "qa-reference-123",
  kind: "inquiry",
  name: "Amina Example",
  organization: "Example Pharmacy",
  email: "amina@example.com",
  phone: "+254700000000",
  town: "Nairobi",
  interest: "Virtual Consultation",
  preferredDate: "",
  preferredTime: "",
  branches: null,
  preferredContact: "Email",
  message: "Please call after 10:00.",
  createdAt: "2026-09-30T12:00:00.000Z",
};

test("routes notifications to the fixed verified destination and identifies virtual consultations", () => {
  const message = buildLeadNotification(baseLead);
  assert.equal(message.to, "abutosystems@gmail.com");
  assert.equal(message.from, "notifications@abutosystems.com");
  assert.equal(message.subject, "New Virtual Consultation Request");
  assert.match(message.text, /Reference: qa-reference-123/);
  assert.match(message.text, /Town \/ Location: Nairobi/);
  assert.match(message.text, /Please call after 10:00\./);
  assert.equal(leadNotificationDestination, message.to);
  assert.equal(leadNotificationSender, message.from);
});

test("creates a minimal general enquiry without empty fields", () => {
  const message = buildLeadNotification({ ...baseLead, interest: "General Enquiry", organization: "", phone: "", town: "", message: "A sufficiently detailed enquiry." });
  assert.equal(message.subject, "New General Enquiry");
  assert.doesNotMatch(message.text, /Business \/ Organization:|Phone:|Town \/ Location:/);
});

test("demo notice includes requested schedule, EAT timezone, and no-confirmation wording", () => {
  const message = buildLeadNotification({ ...baseLead, kind: "demo", interest: "", preferredDate: "2026-10-14", preferredTime: "10:30", branches: 2 });
  assert.equal(message.subject, "New AskanPharma Demo Request");
  assert.match(message.text, /Preferred demo date: 2026-10-14/);
  assert.match(message.text, /Preferred demo time \(EAT \/ UTC\+3\): 10:30/);
  assert.match(message.text, /have not yet been confirmed/);
});

test("keeps user content in plain text and strips control characters", () => {
  const message = buildLeadNotification({ ...baseLead, name: "Amina\r\nBcc: attacker@example.com", message: "Line one\u0000\nLine two" });
  assert.match(message.text, /Full name: Amina Bcc: attacker@example.com/);
  assert.match(message.text, /Line one Line two/);
  assert.equal("html" in message, false);
});

test("sends only the constructed fixed-recipient message to Resend", async () => {
  let request;
  await sendLeadNotification("test-key", baseLead, async (url, init) => {
    request = { url, init };
    return Response.json({ id: "mail-1" });
  });
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.Authorization, "Bearer test-key");
  const payload = JSON.parse(request.init.body);
  assert.deepEqual(payload.to, ["abutosystems@gmail.com"]);
  assert.equal(payload.from, leadNotificationFrom);
  assert.equal(leadNotificationFrom, "Abuto Systems <notifications@abutosystems.com>");
  assert.equal(payload.subject, "New Virtual Consultation Request");
  assert.match(payload.text, /Reference: qa-reference-123/);
});

test("uses a generic error for Resend rejection without exposing its response body", async () => {
  await assert.rejects(
    sendLeadNotification("test-key", baseLead, async () => new Response("private provider details", { status: 429 })),
    /rate_limited/,
  );
});

test("fails on network errors without changing the lead", async () => {
  await assert.rejects(sendLeadNotification("test-key", baseLead, async () => { throw new Error("unavailable"); }), /unavailable/);
  assert.equal(baseLead.id, "qa-reference-123");
});

test("fails closed if the Resend API key is missing", async () => {
  await assert.rejects(sendLeadNotification(undefined, baseLead), /not configured/);
});

test("stores the lead before attempting a notification and treats email failure as best effort", async () => {
  const operations = [];
  const database = {
    prepare: query => {
      assert.match(query, /INSERT INTO leads/);
      return { bind: (...values) => ({ run: async () => { operations.push(["stored", values[0]]); return { success: true }; } }) };
    },
  };
  const oldWarn = console.warn;
  console.warn = () => {};
  const fetcher = async (_url, init) => { operations.push(["emailed", JSON.parse(init.body).to[0]]); throw new Error("unavailable"); };
  let stored;
  try {
    stored = await storeLeadAndNotify(database, "test-key", baseLead, fetcher);
  } finally {
    console.warn = oldWarn;
  }
  assert.equal(stored, true);
  assert.equal(operations.length, 2);
  assert.equal(operations[0][0], "stored");
  assert.equal(operations[1][0], "emailed");
});

test("does not notify when D1 rejects the insert", async () => {
  let sendCount = 0;
  const database = { prepare: () => ({ bind: () => ({ run: async () => ({ success: false }) }) }) };
  const fetcher = async () => { sendCount += 1; return Response.json({ id: "mail-1" }); };
  assert.equal(await storeLeadAndNotify(database, "test-key", baseLead, fetcher), false);
  assert.equal(sendCount, 0);
});
