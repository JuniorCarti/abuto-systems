import { addCalendarAttendee, createCalendarEvent, getCalendarEvent, GoogleCalendarError, meetConference, queryCalendarBusy, requestCalendarConference, type GoogleCalendarConfig } from "./google-calendar.ts";
import { createRequestedBooking, findBooking, findD1BusySlots, findSlotConflict, googleEventId, hashIdempotencyKey, beginCalendarReservation, updateBooking, type BookingDatabase, type DemoBooking } from "./demo-booking-store.ts";
import { sendDemoConfirmation, sendLeadNotification } from "./lead-notification.ts";
import { filterBusySlots, formatSlotInNairobi, getDemoSlotsForDate, validateRequestedSlot } from "./demo-scheduling.ts";
import type { ValidatedLead } from "./lead-validation.ts";

type ServiceFetch = typeof fetch;
type ServiceDependencies = {
  database: BookingDatabase;
  google: GoogleCalendarConfig;
  resendApiKey?: string;
  fetcher?: ServiceFetch;
  now?: Date;
};

function providerCode(error: unknown) {
  return error instanceof GoogleCalendarError ? error.code : "provider_unavailable";
}

function sameBookingInput(booking: DemoBooking, lead: ValidatedLead) {
  return booking.name === lead.name && booking.organization === lead.organization && booking.email === lead.email &&
    booking.phone === lead.phone && booking.town === lead.town && booking.preferred_contact === lead.preferredContact &&
    booking.branches === lead.branches && booking.message === lead.message &&
    booking.preferred_date === lead.preferredDate && booking.preferred_time === lead.preferredTime;
}

function rowLead(booking: DemoBooking) {
  return {
    kind: "demo" as const,
    name: booking.name,
    organization: booking.organization,
    email: booking.email,
    phone: booking.phone,
    town: booking.town,
    interest: "AskanPharma",
    preferredDate: booking.preferred_date ?? "",
    preferredTime: booking.preferred_time ?? "",
    branches: booking.branches,
    preferredContact: booking.preferred_contact,
    message: booking.message,
  };
}

async function notifyInternal(apiKey: string | undefined, booking: DemoBooking, fetcher: ServiceFetch, confirmed: boolean) {
  try {
    await sendLeadNotification(apiKey, {
      ...rowLead(booking),
      id: booking.lead_id,
      createdAt: booking.created_at,
    }, fetcher, `askpharma-demo-${confirmed ? "confirmed" : "request"}/${booking.lead_id}`, confirmed);
  } catch (error) {
    const reason = error instanceof Error && /^Lead notification failed: (?:rate_limited|authentication|provider_unavailable|provider_rejected|malformed_response)$/.test(error.message)
      ? error.message.slice("Lead notification failed: ".length)
      : "network_or_configuration";
    console.warn("Demo lead notification delivery failed.", { reason });
  }
}

function pendingResult() {
  return {
    state: "request_received" as const,
    message: "Your request was received, but we couldn't complete scheduling automatically. We'll contact you to confirm the time.",
  };
}

async function sendCustomerConfirmation(deps: ServiceDependencies, booking: DemoBooking, fetcher: ServiceFetch) {
  if (booking.notification_status === "sent" || booking.notification_status === "sending") return booking.notification_status === "sent";
  const attemptedAt = new Date().toISOString();
  await updateBooking(deps.database, booking.lead_id, { notification_status: "sending", notification_attempted_at: attemptedAt });
  const times = formatSlotInNairobi(booking.scheduled_start_at, booking.scheduled_end_at);
  try {
    await sendDemoConfirmation(deps.resendApiKey, {
      id: booking.lead_id,
      name: booking.name,
      email: booking.email,
      date: times.date,
      startTime: times.start,
      endTime: times.end,
      meetUrl: booking.meet_url ?? "",
    }, fetcher);
    await updateBooking(deps.database, booking.lead_id, { notification_status: "sent", last_error_code: null });
    return true;
  } catch (error) {
    const knownRejected = error instanceof Error && /^Demo confirmation failed: (?:rate_limited|authentication|provider_rejected)$/.test(error.message);
    if (knownRejected) {
      const reason = error.message.slice("Demo confirmation failed: ".length);
      await updateBooking(deps.database, booking.lead_id, { notification_status: "failed", last_error_code: `email_${reason}` });
    } else {
      // A timeout or server error can mean Resend accepted the message but its response was lost.
      // Keep the durable sending marker to prevent an unsafe duplicate.
      console.warn("Demo confirmation delivery outcome is unknown.", { reason: "delivery_outcome_unknown" });
    }
    return false;
  }
}

async function confirmedResult(deps: ServiceDependencies, booking: DemoBooking, fetcher: ServiceFetch, notifyOperations = false) {
  const emailSent = await sendCustomerConfirmation(deps, booking, fetcher);
  if (notifyOperations) await notifyInternal(deps.resendApiKey, booking, fetcher, true);
  const times = formatSlotInNairobi(booking.scheduled_start_at, booking.scheduled_end_at);
  return {
    state: "confirmed" as const,
    message: "Your AskanPharma demo is confirmed.",
    date: times.date,
    startTime: times.start,
    endTime: times.end,
    durationMinutes: 30,
    timeZone: "Africa/Nairobi",
    meetUrl: booking.meet_url,
    calendarInvitationRequested: booking.invitation_status === "sent",
    confirmationEmailSent: emailSent,
  };
}

async function ensureMeetEvent(deps: ServiceDependencies, booking: DemoBooking, fetcher: ServiceFetch) {
  let event = await getCalendarEvent(deps.google, booking.calendar_event_id, fetcher);
  if (!event) {
    const lines = [
      `Customer: ${booking.name}`,
      `Business: ${booking.organization}`,
      `Email: ${booking.email}`,
      booking.phone ? `Phone: ${booking.phone}` : "",
      booking.branches ? `Branches: ${booking.branches}` : "",
      booking.message ? `Notes: ${booking.message}` : "",
      `Booking reference: ${booking.lead_id}`,
    ].filter(Boolean).map(line => line.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/ {2,}/g, " ").trim());
    event = await createCalendarEvent(deps.google, {
      id: booking.calendar_event_id,
      conferenceRequestId: booking.conference_request_id,
      title: `AskanPharma Demo — ${booking.organization.replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, 160)}`,
      description: lines.join("\n"),
      email: booking.email,
      start: booking.scheduled_start_at,
      end: booking.scheduled_end_at,
    }, fetcher);
  }
  if (!event.id || event.id !== booking.calendar_event_id) throw new GoogleCalendarError("invalid_response");

  let attendee = event.attendees?.some(item => item.email?.toLowerCase() === booking.email.toLowerCase());
  if (!attendee) {
    event = await addCalendarAttendee(deps.google, booking.calendar_event_id, booking.email, fetcher);
    attendee = event.id === booking.calendar_event_id && event.attendees?.some(item => item.email?.toLowerCase() === booking.email.toLowerCase());
  }
  if (!attendee) {
    await updateBooking(deps.database, booking.lead_id, {
      status: "pending_calendar", reservation_expires_at: null, calendar_status: "created",
      calendar_event_html_link: event.htmlLink ?? null, invitation_status: "failed", last_error_code: "attendee_missing",
    });
    return null;
  }

  let conference = meetConference(event);
  if (conference.status === "failed" && booking.conference_attempts < 3) {
    const requestId = crypto.randomUUID().replaceAll("-", "");
    const nextAttempt = booking.conference_attempts + 1;
    await updateBooking(deps.database, booking.lead_id, {
      conference_request_id: requestId,
      conference_attempts: nextAttempt,
      conference_status: "pending",
      last_error_code: null,
    });
    event = await requestCalendarConference(deps.google, booking.calendar_event_id, requestId, fetcher);
    conference = meetConference(event);
  }
  for (let attempt = 0; conference.status === "pending" && attempt < 3; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 350));
    const refreshed = await getCalendarEvent(deps.google, booking.calendar_event_id, fetcher);
    if (!refreshed) break;
    event = refreshed;
    conference = meetConference(event);
  }
  if (conference.status !== "success" || !conference.url) {
    await updateBooking(deps.database, booking.lead_id, {
      status: "pending_calendar", reservation_expires_at: null, calendar_status: "created",
      calendar_event_html_link: event.htmlLink ?? null,
      conference_status: conference.status,
      meet_url: null,
      invitation_status: "sent",
      last_error_code: conference.status === "failed" ? "conference_failed" : "conference_pending",
    });
    return null;
  }

  await updateBooking(deps.database, booking.lead_id, {
    status: "confirmed", reservation_expires_at: null, calendar_status: "created",
    calendar_event_html_link: event.htmlLink ?? null, conference_status: "success", meet_url: conference.url,
    invitation_status: "sent", last_error_code: null,
  });
  return { ...booking, status: "confirmed" as const, calendar_status: "created" as const, conference_status: "success" as const, meet_url: conference.url, calendar_event_html_link: event.htmlLink ?? null, invitation_status: "sent" as const, reservation_expires_at: null };
}

export async function findAvailableDemoSlots(date: string, deps: Pick<ServiceDependencies, "database" | "google" | "fetcher" | "now">) {
  const now = deps.now ?? new Date();
  const slots = getDemoSlotsForDate(date, now);
  if (!slots.length) return [];
  const fetcher = deps.fetcher ?? fetch;
  const timeMin = slots[0].start;
  const timeMax = slots[slots.length - 1].end;
  const [calendarBusy, databaseBusy] = await Promise.all([
    queryCalendarBusy(deps.google, timeMin, timeMax, fetcher),
    findD1BusySlots(deps.database, timeMin, timeMax, now.toISOString()),
  ]);
  return filterBusySlots(slots, [...calendarBusy, ...databaseBusy]);
}

export type BookingResult =
  | { state: "confirmed"; message: string; date: string; startTime: string; endTime: string; durationMinutes: number; timeZone: string; meetUrl: string | null; calendarInvitationRequested: boolean; confirmationEmailSent: boolean }
  | { state: "request_received"; message: string }
  | { state: "idempotency_conflict"; message: string }
  | { state: "slot_unavailable"; message: string }
  | { state: "in_progress"; message: string };

export async function bookDemo(lead: ValidatedLead, idempotencyKey: string, deps: ServiceDependencies): Promise<BookingResult> {
  const now = deps.now ?? new Date();
  const fetcher = deps.fetcher ?? fetch;
  const slot = validateRequestedSlot(lead.preferredDate, lead.preferredTime, now);
  if (!slot) return { state: "slot_unavailable", message: "Choose a valid available 30-minute demo time." };

  const keyHash = await hashIdempotencyKey(idempotencyKey);
  let booking = await findBooking(deps.database, keyHash);
  if (booking && !sameBookingInput(booking, lead)) {
    return { state: "idempotency_conflict", message: "This request key was already used for a different submission. Refresh the form and try again." };
  }
  if (booking?.status === "confirmed") return confirmedResult(deps, booking, fetcher);
  let createdThisRequest = false;
  if (booking?.status === "checking_calendar" && booking.reservation_expires_at && booking.reservation_expires_at > now.toISOString()) {
    return { state: "in_progress", message: "Your booking request is still being processed. Please wait a moment and try again." };
  }
  if (booking && (booking.scheduled_start_at !== slot.start || booking.scheduled_end_at !== slot.end)) {
    return { state: "idempotency_conflict", message: "This request key was already used for a different time. Refresh the form and try again." };
  }
  if (!booking) {
    const eventId = await googleEventId(keyHash);
    try {
      booking = await createRequestedBooking(deps.database, lead, keyHash, slot.start, slot.end, eventId);
      createdThisRequest = Boolean(booking);
    }
    catch {
      booking = await findBooking(deps.database, keyHash);
      if (!booking) return { state: "slot_unavailable", message: "That time is no longer available. Please choose another time." };
    }
  }
  if (!booking) return { state: "request_received", message: "Your request was received. We'll contact you to confirm the next steps." };

  let existingEvent = null;
  if (booking.calendar_status !== "pending" || booking.status === "pending_calendar") {
    try {
      existingEvent = await getCalendarEvent(deps.google, booking.calendar_event_id, fetcher);
      if (existingEvent) {
        await updateBooking(deps.database, booking.lead_id, { status: "pending_calendar", reservation_expires_at: null });
        booking = { ...booking, status: "pending_calendar", reservation_expires_at: null };
      }
    } catch {
      if (createdThisRequest) await notifyInternal(deps.resendApiKey, booking, fetcher, false);
      return pendingResult();
    }
  }

  if (!existingEvent) {
    let calendarBusy: Array<{ start: string; end: string }>;
    try { calendarBusy = await queryCalendarBusy(deps.google, slot.start, slot.end, fetcher); }
    catch (error) {
      await updateBooking(deps.database, booking.lead_id, { status: "calendar_failed", calendar_status: "failed", last_error_code: providerCode(error), reservation_expires_at: null });
      const failedBooking = { ...booking, status: "calendar_failed" as const };
      if (createdThisRequest) await notifyInternal(deps.resendApiKey, failedBooking, fetcher, false);
      return pendingResult();
    }
    const d1Busy = await findSlotConflict(deps.database, slot.start, now.toISOString());
    const overlaps = calendarBusy.some(range => Date.parse(slot.start) < Date.parse(range.end) && Date.parse(slot.end) > Date.parse(range.start));
    if (overlaps || (d1Busy && d1Busy.lead_id !== booking.lead_id)) return { state: "slot_unavailable", message: "That time is no longer available. Please choose another available time." };

    const reserved = await beginCalendarReservation(deps.database, booking, now);
    if (!reserved) {
      const latest = await findBooking(deps.database, keyHash);
      if (latest?.status === "confirmed") return confirmedResult(deps, latest, fetcher);
      if (latest?.status === "pending_calendar") booking = latest;
      else if (latest?.status === "checking_calendar") return { state: "in_progress", message: "Your booking request is still being processed. Please wait a moment and try again." };
      else return { state: "slot_unavailable", message: "That time is no longer available. Please choose another available time." };
    } else {
      booking = { ...booking, status: "checking_calendar" };
    }
  }

  let updated: DemoBooking | null;
  try {
    updated = await ensureMeetEvent(deps, booking, fetcher);
  } catch (error) {
    const reason = providerCode(error);
    await updateBooking(deps.database, booking.lead_id, {
      status: "calendar_failed", calendar_status: "failed", last_error_code: reason, reservation_expires_at: null,
    });
    const latest = await findBooking(deps.database, keyHash);
    if (latest && createdThisRequest) await notifyInternal(deps.resendApiKey, latest, fetcher, false);
    return pendingResult();
  }
  if (!updated) {
    const latest = await findBooking(deps.database, keyHash);
    if (latest && createdThisRequest) await notifyInternal(deps.resendApiKey, latest, fetcher, false);
    return pendingResult();
  }
  return confirmedResult(deps, updated, fetcher, createdThisRequest);
}
