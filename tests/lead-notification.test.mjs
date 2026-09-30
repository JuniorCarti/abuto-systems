import assert from "node:assert/strict";
import test from "node:test";
import { buildLeadNotification, leadNotificationDestination, leadNotificationSender, sendLeadNotification, storeLeadAndNotify } from "../lib/lead-notification.ts";

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

test("sends only the constructed fixed-recipient message", async () => {
  let sent;
  await sendLeadNotification({ send: async message => { sent = message; return { messageId: "mail-1" }; } }, baseLead);
  assert.equal(sent.to, "abutosystems@gmail.com");
  assert.equal(sent.from, "notifications@abutosystems.com");
});

test("fails when the binding fails without changing the lead", async () => {
  await assert.rejects(sendLeadNotification({ send: async () => { throw new Error("unavailable"); } }, baseLead), /unavailable/);
  assert.equal(baseLead.id, "qa-reference-123");
});

test("fails closed if notification binding is missing", async () => {
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
  const binding = { send: async message => { operations.push(["emailed", message.to]); throw new Error("unavailable"); } };
  assert.equal(await storeLeadAndNotify(database, binding, baseLead), true);
  assert.equal(operations.length, 2);
  assert.equal(operations[0][0], "stored");
  assert.equal(operations[1][0], "emailed");
});

test("does not notify when D1 rejects the insert", async () => {
  let sendCount = 0;
  const database = { prepare: () => ({ bind: () => ({ run: async () => ({ success: false }) }) }) };
  const binding = { send: async () => { sendCount += 1; } };
  assert.equal(await storeLeadAndNotify(database, binding, baseLead), false);
  assert.equal(sendCount, 0);
});
