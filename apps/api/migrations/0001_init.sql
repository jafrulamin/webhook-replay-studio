CREATE TABLE IF NOT EXISTS inboxes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inboxes_created_at ON inboxes(created_at);
