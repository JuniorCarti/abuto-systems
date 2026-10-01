import test from "node:test";
import assert from "node:assert/strict";
import { addCalendarAttendee, GoogleCalendarError, calendarScopes, createCalendarEvent, meetConference, organizerCalendar, queryCalendarBusy, requestCalendarConference } from "../lib/google-calendar.ts";

const config = { GOOGLE_CALENDAR_CLIENT_ID: "client-id", GOOGLE_CALENDAR_CLIENT_SECRET: "client-secret", GOOGLE_CALENDAR_REFRESH_TOKEN: "refresh-token" };

function tokenResponse() { return Response.json({ access_token: "test-access-token", expires_in: 3600 }); }

test("uses only the two approved Calendar scopes in the server integration", () => {
  assert.deepEqual(calendarScopes, [
    "https://www.googleapis.com/auth/calendar.events.freebusy",
    "https://www.googleapis.com/auth/calendar.events.owned",
  ]);
  assert.equal(organizerCalendar, "abutosystems@gmail.com");
});

test("refreshes an access token and requests only busy ranges for the organizer", async () => {
  const requests = [];
  const result = await queryCalendarBusy(config, "2026-10-05T05:00:00.000Z", "2026-10-05T14:30:00.000Z", async (url, init) => {
    requests.push({ url: String(url), init });
    if (String(url).includes("oauth2.googleapis.com/token")) return tokenResponse();
    return Response.json({ calendars: { [organizerCalendar]: { busy: [{ start: "2026-10-05T06:00:00Z", end: "2026-10-05T06:30:00Z" }] } } });
  });
  assert.equal(requests.length, 2);
  assert.match(requests[0].init.body.toString(), /grant_type=refresh_token/);
  assert.equal(requests[1].init.headers.Authorization, "Bearer test-access-token");
  const body = JSON.parse(requests[1].init.body);
  assert.equal(body.timeZone, "Africa/Nairobi");
  assert.deepEqual(body.items, [{ id: organizerCalendar }]);
  assert.equal(result.length, 1);
});

test("fails closed for OAuth errors and Calendar HTTP errors", async () => {
  await assert.rejects(queryCalendarBusy({}, "a", "b", async () => { throw new Error("must not fetch"); }), error => error instanceof GoogleCalendarError && error.code === "not_configured");
  await assert.rejects(queryCalendarBusy(config, "a", "b", async () => Response.json({ error: "invalid_grant" }, { status: 400 })), error => error.code === "oauth_denied");
  for (const [status, code] of [[401, "unauthorized"], [403, "forbidden"], [429, "rate_limited"], [503, "provider_unavailable"]]) {
    let apiCall = false;
    await assert.rejects(queryCalendarBusy(config, "a", "b", async url => {
      if (String(url).includes("oauth2.googleapis.com/token")) return tokenResponse();
      apiCall = true;
      return new Response(null, { status });
    }), error => error instanceof GoogleCalendarError && error.code === code);
    assert.equal(apiCall, true);
  }
});

test("fails closed when FreeBusy omits the organizer or returns malformed intervals", async () => {
  const token = async url => String(url).includes("oauth2.googleapis.com/token") ? tokenResponse() : Response.json({ calendars: {} });
  await assert.rejects(queryCalendarBusy(config, "a", "b", token), error => error.code === "provider_rejected");
  const malformed = async url => String(url).includes("oauth2.googleapis.com/token") ? tokenResponse() : Response.json({ calendars: { [organizerCalendar]: { busy: [{ start: "not-a-date", end: "also-not-a-date" }] } } });
  await assert.rejects(queryCalendarBusy(config, "a", "b", malformed), error => error.code === "invalid_response");
});

test("creates a 30-minute attendee event with Calendar updates and Meet generation", async () => {
  let eventRequest;
  const event = {
    id: "abuto012345",
    attendees: [{ email: "customer@example.com" }],
    conferenceData: { createRequest: { status: { statusCode: "pending" } } },
  };
  await createCalendarEvent(config, {
    id: event.id, conferenceRequestId: "conference-1", title: "AskanPharma Demo — Example Pharmacy",
    description: "Customer: Example", email: "customer@example.com",
    start: "2026-10-05T05:00:00.000Z", end: "2026-10-05T05:30:00.000Z",
  }, async (url, init) => {
    if (String(url).includes("oauth2.googleapis.com/token")) return tokenResponse();
    eventRequest = { url: String(url), init, body: JSON.parse(init.body) };
    return Response.json(event);
  });
  assert.match(eventRequest.url, /conferenceDataVersion=1/);
  assert.match(eventRequest.url, /sendUpdates=all/);
  assert.equal(eventRequest.body.attendees[0].email, "customer@example.com");
  assert.equal(eventRequest.body.start.timeZone, "Africa/Nairobi");
  assert.equal(eventRequest.body.end.dateTime, "2026-10-05T05:30:00.000Z");
  assert.equal(eventRequest.body.conferenceData.createRequest.requestId, "conference-1");
  assert.equal(meetConference(event).status, "pending");
  assert.deepEqual(meetConference({ conferenceData: { createRequest: { status: { statusCode: "success" } }, entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" }] } }), { status: "success", url: "https://meet.google.com/abc-defg-hij" });
  assert.equal(meetConference({ conferenceData: { createRequest: { status: { statusCode: "failure" } } } }).status, "failed");
});

test("retries Meet generation and attendee updates on the same Calendar event", async () => {
  const calls = [];
  const fetcher = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return String(url).includes("oauth2.googleapis.com/token") ? tokenResponse() : Response.json({ id: "event-1", attendees: [{ email: "customer@example.com" }] });
  };
  await requestCalendarConference(config, "event-1", "conference-retry-1", fetcher);
  await addCalendarAttendee(config, "event-1", "customer@example.com", fetcher);
  const conferenceCall = calls.find(call => call.url.includes("conferenceDataVersion=1"));
  const attendeeCall = calls.filter(call => call.url.includes("sendUpdates=all")).at(-1);
  assert.ok(conferenceCall);
  assert.equal(JSON.parse(conferenceCall.init.body).conferenceData.createRequest.requestId, "conference-retry-1");
  assert.ok(attendeeCall);
  assert.deepEqual(JSON.parse(attendeeCall.init.body).attendees, [{ email: "customer@example.com" }]);
});
