import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beginCalendarReservation, createRequestedBooking, findBooking, findSlotConflict, googleEventId, hashIdempotencyKey } from "../lib/demo-booking-store.ts";
import { bookDemo } from "../lib/demo-booking-service.ts";
import { validateRequestedSlot } from "../lib/demo-scheduling.ts";

class D1Fake {
  constructor() {
    this.sqlite = new DatabaseSync(":memory:");
    this.sqlite.exec("PRAGMA foreign_keys = ON");
    for (const migration of ["0001_create_leads.sql", "0002_demo_bookings.sql"]) {
      this.sqlite.exec(readFileSync(new URL(`../migrations/${migration}`, import.meta.url), "utf8"));
    }
  }
  prepare(query) {
    const database = this.sqlite;
    return {
      bind(...values) {
        return {
          run: async () => {
            const result = database.prepare(query).run(...values);
            return { success: true, meta: { changes: result.changes } };
          },
          first: async () => database.prepare(query).get(...values) ?? null,
          all: async () => ({ success: true, results: database.prepare(query).all(...values) }),
        };
      },
    };
  }
  async batch(statements) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
  close() { this.sqlite.close(); }
  count(table) { return this.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count; }
}

const lead = {
  kind: "demo", name: "Amina Example", organization: "Example Pharmacy", email: "amina@example.com",
  phone: "+254700000000", town: "Nairobi", interest: "", preferredDate: "2026-10-05",
  preferredTime: "08:00", branches: 2, preferredContact: "Email", message: "Show stock management.",
};
const fixedNow = new Date("2026-10-01T09:00:00.000Z");

async function addRequested(database, submittedLead, rawKey) {
  const slot = validateRequestedSlot(submittedLead.preferredDate, submittedLead.preferredTime, fixedNow);
  const keyHash = await hashIdempotencyKey(rawKey);
  const eventId = await googleEventId(keyHash);
  const booking = await createRequestedBooking(database, submittedLead, keyHash, slot.start, slot.end, eventId);
  return { booking, keyHash };
}

test("D1 reservation uniqueness lets only one simultaneous request reserve a slot", async t => {
  const database = new D1Fake();
  t.after(() => database.close());
  const a = await addRequested(database, lead, "8d45c668-54c2-4ac2-9bce-3c06e9dbd4b7");
  const b = await addRequested(database, { ...lead, name: "Another Customer", email: "another@example.com" }, "0e08d431-e23b-4f60-862c-c18e22710352");
  const results = await Promise.all([
    beginCalendarReservation(database, a.booking, fixedNow),
    beginCalendarReservation(database, b.booking, fixedNow),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.ok(await findSlotConflict(database, a.booking.scheduled_start_at, fixedNow.toISOString()));
});

test("duplicate idempotency key rolls back its extra D1 lead insert", async t => {
  const database = new D1Fake();
  t.after(() => database.close());
  const first = await addRequested(database, lead, "8d45c668-54c2-4ac2-9bce-3c06e9dbd4b7");
  const slot = validateRequestedSlot(lead.preferredDate, lead.preferredTime, fixedNow);
  await assert.rejects(createRequestedBooking(database, lead, first.keyHash, slot.start, slot.end, await googleEventId(first.keyHash)));
  assert.equal(database.count("leads"), 1);
  assert.equal(database.count("demo_bookings"), 1);
  assert.ok(await findBooking(database, first.keyHash));
});

test("Calendar event IDs use supported base32hex characters and remain deterministic", async () => {
  const keyHash = await hashIdempotencyKey("8d45c668-54c2-4ac2-9bce-3c06e9dbd4b7");
  const eventId = await googleEventId(keyHash);
  assert.match(eventId, /^[0-9a-v]{50,}$/);
  assert.equal(await googleEventId(keyHash), eventId);
});

test("Calendar event and confirmation retry use one stored booking and idempotency keys", async t => {
  const database = new D1Fake();
  t.after(() => database.close());
  const google = { GOOGLE_CALENDAR_CLIENT_ID: "client", GOOGLE_CALENDAR_CLIENT_SECRET: "secret", GOOGLE_CALENDAR_REFRESH_TOKEN: "refresh" };
  const calendarEvents = new Map();
  const emailKeys = [];
  let eventCreates = 0;
  const fetcher = async (url, init = {}) => {
    const address = String(url);
    if (address.includes("oauth2.googleapis.com/token")) return Response.json({ access_token: "ephemeral-token" });
    if (address.includes("/freeBusy")) return Response.json({ calendars: { "abutosystems@gmail.com": { busy: [] } } });
    if (address.includes("/events?") && init.method === "POST") {
      eventCreates += 1;
      const input = JSON.parse(init.body);
      const created = {
        id: input.id,
        htmlLink: "https://calendar.google.com/calendar/event?eid=test",
        attendees: input.attendees,
        conferenceData: { createRequest: { status: { statusCode: "success" } }, entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" }] },
      };
      calendarEvents.set(input.id, created);
      return Response.json(created);
    }
    if (address.includes("/events/")) {
      const eventId = decodeURIComponent(address.split("/events/")[1].split("?")[0]);
      const found = calendarEvents.get(eventId);
      return found ? Response.json(found) : Response.json({ error: { message: "not found" } }, { status: 404 });
    }
    if (address === "https://api.resend.com/emails") {
      emailKeys.push({ key: init.headers["Idempotency-Key"], to: JSON.parse(init.body).to[0] });
      return Response.json({ id: `email-${emailKeys.length}` });
    }
    throw new Error("Unexpected mocked request");
  };
  const dependencies = { database, google, resendApiKey: "test-resend-key", fetcher, now: fixedNow };
  const key = "8d45c668-54c2-4ac2-9bce-3c06e9dbd4b7";
  const first = await bookDemo(lead, key, dependencies);
  const retry = await bookDemo(lead, key, dependencies);
  const changedPayload = await bookDemo({ ...lead, email: "someone-else@example.com" }, key, dependencies);
  assert.equal(first.state, "confirmed");
  assert.equal(first.durationMinutes, 30);
  assert.equal(first.meetUrl, "https://meet.google.com/abc-defg-hij");
  assert.equal(retry.state, "confirmed");
  assert.equal(changedPayload.state, "idempotency_conflict");
  assert.equal(eventCreates, 1);
  assert.equal(emailKeys.filter(item => item.to === lead.email).length, 1);
  assert.equal(database.count("leads"), 1);
  assert.equal(database.count("demo_bookings"), 1);
});

test("Resend failure does not undo a confirmed Calendar booking", async t => {
  const database = new D1Fake();
  t.after(() => database.close());
  const calendarEvents = new Map();
  const dependencies = {
    database,
    google: { GOOGLE_CALENDAR_CLIENT_ID: "client", GOOGLE_CALENDAR_CLIENT_SECRET: "secret", GOOGLE_CALENDAR_REFRESH_TOKEN: "refresh" },
    resendApiKey: "test-key",
    now: fixedNow,
    fetcher: async (url, init = {}) => {
      const address = String(url);
      if (address.includes("oauth2.googleapis.com/token")) return Response.json({ access_token: "temporary" });
      if (address.includes("/freeBusy")) return Response.json({ calendars: { "abutosystems@gmail.com": { busy: [] } } });
      if (address.includes("/events?") && init.method === "POST") {
        const input = JSON.parse(init.body);
        const event = { id: input.id, attendees: input.attendees, conferenceData: { createRequest: { status: { statusCode: "success" } }, entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" }] } };
        calendarEvents.set(input.id, event);
        return Response.json(event);
      }
      if (address.includes("/events/")) {
        const id = decodeURIComponent(address.split("/events/")[1].split("?")[0]);
        return calendarEvents.has(id) ? Response.json(calendarEvents.get(id)) : Response.json({}, { status: 404 });
      }
      if (address === "https://api.resend.com/emails") return new Response("provider response body is not surfaced", { status: 503 });
      throw new Error("Unexpected mocked request");
    },
  };
  const oldWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await bookDemo(lead, "8d45c668-54c2-4ac2-9bce-3c06e9dbd4b7", dependencies);
    assert.equal(result.state, "confirmed");
    assert.equal(result.confirmationEmailSent, false);
    assert.equal(database.sqlite.prepare("SELECT status FROM demo_bookings").get().status, "confirmed");
    assert.equal(database.sqlite.prepare("SELECT notification_status FROM demo_bookings").get().notification_status, "sending");
  } finally {
    console.warn = oldWarn;
  }
});

test("Calendar failure returns request semantics and never claims a confirmed booking", async t => {
  const database = new D1Fake();
  t.after(() => database.close());
  const oldWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await bookDemo(lead, "8d45c668-54c2-4ac2-9bce-3c06e9dbd4b7", {
      database, google: {}, resendApiKey: undefined, fetcher: async () => { throw new Error("should not call without OAuth secrets"); }, now: fixedNow,
    });
    assert.equal(result.state, "request_received");
    assert.match(result.message, /couldn't complete scheduling automatically/);
    assert.equal(database.sqlite.prepare("SELECT status FROM demo_bookings").get().status, "calendar_failed");
  } finally {
    console.warn = oldWarn;
  }
});
