ALTER TABLE inboxes ADD COLUMN owner_token TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_inboxes_owner_token ON inboxes(owner_token);
