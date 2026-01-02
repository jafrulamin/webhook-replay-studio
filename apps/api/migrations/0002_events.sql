CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  inbox_id TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  query_json TEXT NOT NULL,
  headers_json TEXT NOT NULL,
  content_type TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_json TEXT,
  truncated INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_inbox_received_at
ON events(inbox_id, received_at);
