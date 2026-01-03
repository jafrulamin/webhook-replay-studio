import { Hono } from "hono";
import { makeId } from "../utils/ids";
import { runReplayJob } from "../utils/replayRunner";

type Bindings = {
  DB: D1Database;
};

export const replayJobsRoute = new Hono<{ Bindings: Bindings }>();

function parseJsonSafe(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isHttpUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.protocol === "http:") return true;
    if (u.protocol === "https:") return true;
    return false;
  } catch {
    return false;
  }
}

replayJobsRoute.post("/api/events/:eventId/replay-jobs", async (c) => {
  const eventId = c.req.param("eventId");

  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  let destinationUrl = "";
  if (body && typeof body.destinationUrl === "string") {
    destinationUrl = body.destinationUrl;
  }

  if (destinationUrl.length === 0) {
    return c.json({ ok: false, error: "missing_destination_url" }, 400);
  }

  if (!isHttpUrl(destinationUrl)) {
    return c.json({ ok: false, error: "invalid_destination_url" }, 400);
  }

  let headerOverrides: any[] = [];
  if (body && Array.isArray(body.headerOverrides)) {
    headerOverrides = body.headerOverrides;
  }

  let jsonOverrides: any[] = [];
  if (body && Array.isArray(body.jsonOverrides)) {
    jsonOverrides = body.jsonOverrides;
  }

  let retryMax = 3;
  if (body && typeof body.retryMax === "number") {
    const n = Math.floor(body.retryMax);
    if (n >= 1 && n <= 5) {
      retryMax = n;
    }
  }

  const evRow = await c.env.DB.prepare(
    "SELECT id, inbox_id FROM events WHERE id = ? LIMIT 1"
  )
    .bind(eventId)
    .first();

  if (!evRow) {
    return c.json({ ok: false, error: "event_not_found" }, 404);
  }

  const inboxId = String((evRow as any).inbox_id);
  const jobId = makeId("job");
  const now = Date.now();

  await c.env.DB.prepare(
    "INSERT INTO replay_jobs (id, event_id, destination_url, header_overrides_json, json_overrides_json, max_attempts, base_delay_ms, status, created_at, last_run_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(
      jobId,
      eventId,
      destinationUrl,
      JSON.stringify(headerOverrides),
      JSON.stringify(jsonOverrides),
      retryMax,
      200,
      "queued",
      now,
      0
    )
    .run();

  c.executionCtx.waitUntil(runReplayJob(c.env.DB, jobId));

  return c.json(
    {
      job: {
        id: jobId,
        eventId: eventId,
        inboxId: inboxId,
        destinationUrl: destinationUrl,
        retryMax: retryMax,
        status: "queued",
        createdAt: new Date(now).toISOString()
      }
    },
    201
  );
});

replayJobsRoute.get("/api/events/:eventId/replay-jobs", async (c) => {
  const eventId = c.req.param("eventId");

  const evRow = await c.env.DB.prepare(
    "SELECT id FROM events WHERE id = ? LIMIT 1"
  )
    .bind(eventId)
    .first();

  if (!evRow) {
    return c.json({ ok: false, error: "event_not_found" }, 404);
  }

  const result = await c.env.DB.prepare(
    "SELECT id, event_id, destination_url, max_attempts, status, created_at FROM replay_jobs WHERE event_id = ? ORDER BY created_at DESC LIMIT 50"
  )
    .bind(eventId)
    .all();

  let rows: any[] = [];
  if (result && result.results) {
    rows = result.results as any[];
  }

  const evRowForInbox = await c.env.DB.prepare(
    "SELECT inbox_id FROM events WHERE id = ? LIMIT 1"
  )
    .bind(eventId)
    .first();

  let inboxId = "";
  if (evRowForInbox) {
    inboxId = String((evRowForInbox as any).inbox_id);
  }

  const jobs: any[] = [];
  for (const r of rows) {
    jobs.push({
      id: r.id,
      eventId: r.event_id,
      inboxId: inboxId,
      destinationUrl: r.destination_url,
      retryMax: r.max_attempts,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString()
    });
  }

  return c.json({ jobs: jobs });
});

replayJobsRoute.get("/api/replay-jobs/:jobId", async (c) => {
  const jobId = c.req.param("jobId");

  const jobRow = await c.env.DB.prepare(
    "SELECT id, event_id, destination_url, header_overrides_json, json_overrides_json, max_attempts, status, created_at, last_run_at FROM replay_jobs WHERE id = ? LIMIT 1"
  )
    .bind(jobId)
    .first();

  if (!jobRow) {
    return c.json({ ok: false, error: "job_not_found" }, 404);
  }

  const job: any = jobRow;
  const eventId = String(job.event_id);

  const evRow = await c.env.DB.prepare(
    "SELECT inbox_id FROM events WHERE id = ? LIMIT 1"
  )
    .bind(eventId)
    .first();

  let inboxId = "";
  if (evRow) {
    inboxId = String((evRow as any).inbox_id);
  }

  const attemptsRes = await c.env.DB.prepare(
    "SELECT id, job_id, attempt_no, started_at, finished_at, success, response_status, response_snippet, error_message, request_headers_json, request_body_text FROM replay_attempts WHERE job_id = ? ORDER BY attempt_no ASC"
  )
    .bind(jobId)
    .all();

  let attempts: any[] = [];
  if (attemptsRes && attemptsRes.results) {
    attempts = attemptsRes.results as any[];
  }

  const outAttempts: any[] = [];

  for (const a of attempts) {
    outAttempts.push({
      id: a.id,
      attemptNo: a.attempt_no,
      startedAt: new Date(a.started_at).toISOString(),
      finishedAt: new Date(a.finished_at).toISOString(),
      ok: a.success === 1,
      responseStatus: a.response_status,
      responseSnippet: a.response_snippet,
      errorMessage: a.error_message,
      requestHeaders: parseJsonSafe(String(a.request_headers_json)),
      requestBody: a.request_body_text
    });
  }

  return c.json({
    job: {
      id: job.id,
      inboxId: inboxId,
      eventId: job.event_id,
      destinationUrl: job.destination_url,
      headerOverrides: parseJsonSafe(String(job.header_overrides_json)),
      jsonOverrides: parseJsonSafe(String(job.json_overrides_json)),
      retryMax: job.max_attempts,
      status: job.status,
      createdAt: new Date(job.created_at).toISOString(),
      updatedAt: (() => {
        if (job.last_run_at && job.last_run_at > 0) {
          return new Date(job.last_run_at).toISOString();
        }
        return "";
      })(),
      lastError: "",
      lastStatusCode: 0
    },
    attempts: outAttempts
  });
});

