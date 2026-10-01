import type { ValidatedLead } from "@/lib/lead-validation";

type Result<T = unknown> = { success: boolean; results?: T[]; meta?: { changes?: number } };
type Statement = {
  bind(...values: Array<string | number | null>): Statement;
  run(): Promise<Result>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<Result<T>>;
};
export type BookingDatabase = {
  prepare(query: string): Statement;
  batch(statements: Statement[]): Promise<Result[]>;
};

export type BookingStatus = "requested" | "checking_calendar" | "pending_calendar" | "confirmed" | "calendar_failed" | "cancelled";
export type DemoBooking = {
  lead_id: string;
  idempotency_key: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  timezone: string;
  status: BookingStatus;
  reservation_expires_at: string | null;
  calendar_event_id: string;
  calendar_event_html_link: string | null;
  calendar_status: "pending" | "created" | "failed";
  conference_request_id: string;
  conference_attempts: number;
  conference_status: "pending" | "success" | "failed";
  meet_url: string | null;
  invitation_status: "pending" | "sent" | "failed";
  notification_status: "pending" | "sending" | "sent" | "failed";
  notification_attempted_at: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  organization: string;
  email: string;
  phone: string;
  town: string;
  preferred_contact: string;
  branches: number | null;
  message: string;
  interest: string;
  preferred_date: string | null;
  preferred_time: string | null;
};

export async function hashIdempotencyKey(key: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function googleEventId(idempotencyHash: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(idempotencyHash)));
  const alphabet = "0123456789abcdefghijklmnopqrstuv";
  let buffer = 0;
  let bits = 0;
  let encoded = "abuto";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += alphabet[(buffer >>> bits) & 31];
    }
  }
  if (bits > 0) encoded += alphabet[(buffer << (5 - bits)) & 31];
  return encoded;
}

export async function findBooking(database: BookingDatabase, keyHash: string) {
  return database.prepare(`
    SELECT b.*, l.name, l.organization, l.email, l.phone, l.town, l.preferred_contact, l.branches, l.message,
      l.interest, l.preferred_date, l.preferred_time
    FROM demo_bookings b JOIN leads l ON l.id = b.lead_id
    WHERE b.idempotency_key = ? LIMIT 1
  `).bind(keyHash).first<DemoBooking>();
}

export async function findSlotConflict(database: BookingDatabase, startAt: string, now: string) {
  return database.prepare(`
    SELECT lead_id FROM demo_bookings
    WHERE scheduled_start_at = ?
      AND (status IN ('pending_calendar', 'confirmed') OR (status = 'checking_calendar' AND reservation_expires_at > ?))
    LIMIT 1
  `).bind(startAt, now).first<{ lead_id: string }>();
}

export async function findD1BusySlots(database: BookingDatabase, startAt: string, endAt: string, now: string) {
  const result = await database.prepare(`
    SELECT scheduled_start_at AS start, scheduled_end_at AS end FROM demo_bookings
    WHERE scheduled_start_at < ? AND scheduled_end_at > ?
      AND (status IN ('pending_calendar', 'confirmed') OR (status = 'checking_calendar' AND reservation_expires_at > ?))
  `).bind(endAt, startAt, now).all<{ start: string; end: string }>();
  return result.results ?? [];
}

export async function createRequestedBooking(database: BookingDatabase, lead: ValidatedLead, keyHash: string, startAt: string, endAt: string, eventId: string) {
  const id = crypto.randomUUID();
  const conferenceRequestId = crypto.randomUUID().replaceAll("-", "");
  const now = new Date().toISOString();
  await database.batch([
    database.prepare(`INSERT INTO leads (
      id, kind, name, organization, email, phone, town, interest,
      preferred_date, preferred_time, branches, preferred_contact, message, created_at
    ) VALUES (?, 'demo', ?, ?, ?, ?, ?, 'AskanPharma', ?, ?, ?, ?, ?, ?)`)
      .bind(id, lead.name, lead.organization, lead.email, lead.phone, lead.town, lead.preferredDate, lead.preferredTime, lead.branches, lead.preferredContact, lead.message, now),
    database.prepare(`INSERT INTO demo_bookings (
      lead_id, idempotency_key, scheduled_start_at, scheduled_end_at, timezone, status,
      calendar_event_id, calendar_status, conference_request_id, conference_attempts, conference_status,
      invitation_status, notification_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'Africa/Nairobi', 'requested', ?, 'pending', ?, 1, 'pending', 'pending', 'pending', ?, ?)`)
      .bind(id, keyHash, startAt, endAt, eventId, conferenceRequestId, now, now),
  ]);
  return findBooking(database, keyHash);
}

export async function beginCalendarReservation(database: BookingDatabase, booking: DemoBooking, now = new Date()) {
  const timestamp = now.toISOString();
  const expires = new Date(now.getTime() + 120_000).toISOString();
  try {
    const results = await database.batch([
      database.prepare(`UPDATE demo_bookings SET status = 'requested', reservation_expires_at = NULL, updated_at = ?
        WHERE status = 'checking_calendar' AND reservation_expires_at <= ?`).bind(timestamp, timestamp),
      database.prepare(`UPDATE demo_bookings SET status = 'checking_calendar', reservation_expires_at = ?, last_error_code = NULL, updated_at = ?
        WHERE lead_id = ? AND status IN ('requested', 'calendar_failed')`).bind(expires, timestamp, booking.lead_id),
    ]);
    return (results[1]?.meta?.changes ?? 0) > 0;
  } catch {
    // The partial unique index is the authoritative race guard. Any failure to
    // acquire that write reservation fails closed as an unavailable slot.
    return false;
  }
}

export async function updateBooking(database: BookingDatabase, leadId: string, fields: Partial<Pick<DemoBooking,
  "status" | "reservation_expires_at" | "calendar_event_html_link" | "calendar_status" | "conference_status" |
  "meet_url" | "invitation_status" | "notification_status" | "notification_attempted_at" | "last_error_code" | "conference_request_id" | "conference_attempts"
>>) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined) as Array<[string, string | null]>;
  if (!entries.length) return;
  const allowed = new Set(["status", "reservation_expires_at", "calendar_event_html_link", "calendar_status", "conference_status", "meet_url", "invitation_status", "notification_status", "notification_attempted_at", "last_error_code", "conference_request_id", "conference_attempts"]);
  if (entries.some(([key]) => !allowed.has(key))) throw new Error("Invalid booking update");
  const assignments = [...entries.map(([key]) => `${key} = ?`), "updated_at = ?"].join(", ");
  const values = [...entries.map(([, value]) => value), new Date().toISOString(), leadId];
  await database.prepare(`UPDATE demo_bookings SET ${assignments} WHERE lead_id = ?`).bind(...values).run();
}
