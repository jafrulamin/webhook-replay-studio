CREATE TABLE IF NOT EXISTS replay_jobs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  header_overrides_json TEXT NOT NULL,
  json_overrides_json TEXT NOT NULL,
  max_attempts INTEGER NOT NULL,
  base_delay_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_run_at INTEGER
);

CREATE TABLE IF NOT EXISTS replay_attempts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  attempt_no INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER NOT NULL,
  request_headers_json TEXT NOT NULL,
  request_body_text TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_snippet TEXT NOT NULL,
  error_message TEXT NOT NULL,
  success INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_replay_jobs_event_id ON replay_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_replay_attempts_job_id ON replay_attempts(job_id);
