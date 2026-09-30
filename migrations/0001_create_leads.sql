CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('inquiry', 'demo')),
  name TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  town TEXT NOT NULL DEFAULT '',
  interest TEXT NOT NULL DEFAULT '',
  preferred_date TEXT,
  preferred_time TEXT,
  branches INTEGER,
  preferred_contact TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at);
CREATE INDEX IF NOT EXISTS leads_kind_created_at_idx ON leads(kind, created_at);
