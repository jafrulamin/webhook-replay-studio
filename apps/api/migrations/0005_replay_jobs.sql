CREATE TABLE IF NOT EXISTS replay_jobs (
  id TEXT PRIMARY KEY,
  inbox_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  header_overrides_json TEXT NOT NULL,
  json_overrides_json TEXT NOT NULL,
  retry_max INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_error TEXT NOT NULL,
  last_status_code INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS replay_attempts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  attempt_no INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  response_status INTEGER NOT NULL,
  response_snippet TEXT NOT NULL,
  error_message TEXT NOT NULL,
  request_headers_json TEXT NOT NULL,
  request_body_raw TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_replay_jobs_event_created ON replay_jobs(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_replay_attempts_job_attempt ON replay_attempts(job_id, attempt_no);

