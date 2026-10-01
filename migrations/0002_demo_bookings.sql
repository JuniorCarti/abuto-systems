CREATE TABLE IF NOT EXISTS demo_bookings (
  lead_id TEXT PRIMARY KEY NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  scheduled_start_at TEXT NOT NULL,
  scheduled_end_at TEXT NOT NULL,
  timezone TEXT NOT NULL CHECK (timezone = 'Africa/Nairobi'),
  status TEXT NOT NULL CHECK (status IN ('requested', 'checking_calendar', 'pending_calendar', 'confirmed', 'calendar_failed', 'cancelled')),
  reservation_expires_at TEXT,
  calendar_event_id TEXT NOT NULL UNIQUE,
  calendar_event_html_link TEXT,
  calendar_status TEXT NOT NULL CHECK (calendar_status IN ('pending', 'created', 'failed')),
  conference_request_id TEXT NOT NULL UNIQUE,
  conference_attempts INTEGER NOT NULL DEFAULT 1,
  conference_status TEXT NOT NULL CHECK (conference_status IN ('pending', 'success', 'failed')),
  meet_url TEXT,
  invitation_status TEXT NOT NULL CHECK (invitation_status IN ('pending', 'sent', 'failed')),
  notification_status TEXT NOT NULL CHECK (notification_status IN ('pending', 'sending', 'sent', 'failed')),
  notification_attempted_at TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS demo_bookings_active_slot_idx
  ON demo_bookings(scheduled_start_at)
  WHERE status IN ('checking_calendar', 'pending_calendar', 'confirmed');

CREATE INDEX IF NOT EXISTS demo_bookings_status_updated_idx
  ON demo_bookings(status, updated_at);
