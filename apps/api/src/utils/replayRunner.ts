import { makeId } from "./ids";

function parseJsonSafe(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeHeaderName(name: string) {
  return name.trim().toLowerCase();
}

function toStringValue(v: any) {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return String(v);
  if (v === null) return "null";
  return JSON.stringify(v);
}

function cloneObj(obj: any) {
  const out: any = {};
  const keys = Object.keys(obj);
  for (const k of keys) {
    out[k] = obj[k];
  }
  return out;
}

function applyHeaderOverrides(original: any, overrides: any[]) {
  const out = cloneObj(original);

  for (const item of overrides) {
    if (!item) continue;

    if (typeof item.name !== "string") continue;
    if (typeof item.action !== "string") continue;

    const name = normalizeHeaderName(item.name);
    if (name.length === 0) continue;

    const action = String(item.action).toLowerCase();

    if (action === "remove") {
      if (Object.prototype.hasOwnProperty.call(out, name)) {
        delete out[name];
      }
      continue;
    }

    if (action === "set") {
      let value = "";
      if (typeof item.value === "string") {
        value = item.value;
      } else {
        value = toStringValue(item.value);
      }

      out[name] = value;
      continue;
    }
  }

  return out;
}

function setPathValue(root: any, path: string, value: any) {
  const parts = path.split(".");
  const clean: string[] = [];

  for (const p of parts) {
    const t = p.trim();
    if (t.length > 0) clean.push(t);
  }

  if (clean.length === 0) return root;

  let obj = root;
  if (obj === null) obj = {};
  if (typeof obj !== "object") obj = {};

  let cur = obj;
  let i = 0;

  while (i < clean.length - 1) {
    const key = clean[i];

    if (cur[key] === null || typeof cur[key] !== "object") {
      cur[key] = {};
    }

    cur = cur[key];
    i = i + 1;
  }

  const lastKey = clean[clean.length - 1];
  cur[lastKey] = value;

  return obj;
}

function cleanHeadersForFetch(h: any) {
  const out: any = {};
  const keys = Object.keys(h);

  for (const k of keys) {
    const n = String(k).toLowerCase();
    if (n === "host") continue;
    if (n === "content-length") continue;
    if (n === "accept-encoding") continue;
    out[n] = h[k];
  }

  return out;
}

function methodAllowsBody(method: string) {
  const m = method.toUpperCase();
  if (m === "GET") return false;
  if (m === "HEAD") return false;
  return true;
}

function snippet(text: string, maxLen: number) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen);
}

function getBackoffDelay(attemptNo: number) {
  const delays = [200, 600, 1400, 3000];
  const idx = attemptNo - 1;
  if (idx < delays.length) {
    return delays[idx];
  }
  return 3000;
}

function sleepMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runReplayJob(db: D1Database, jobId: string) {
  const jobRow = await db
    .prepare("SELECT id, event_id, destination_url, header_overrides_json, json_overrides_json, max_attempts FROM replay_jobs WHERE id = ? LIMIT 1")
    .bind(jobId)
    .first();

  if (!jobRow) return;

  const job: any = jobRow;
  const eventId = String(job.event_id);
  const destUrl = String(job.destination_url);
  const retryMax = Number(job.max_attempts);

  const headerOverridesParsed = parseJsonSafe(String(job.header_overrides_json));
  const jsonOverridesParsed = parseJsonSafe(String(job.json_overrides_json));

  let headerOverrides: any[] = [];
  if (Array.isArray(headerOverridesParsed)) {
    headerOverrides = headerOverridesParsed;
  }

  let jsonOverrides: any[] = [];
  if (Array.isArray(jsonOverridesParsed)) {
    jsonOverrides = jsonOverridesParsed;
  }

  const ev = await db
    .prepare("SELECT id, method, headers_json, content_type, body_text, body_json FROM events WHERE id = ? LIMIT 1")
    .bind(eventId)
    .first();

  if (!ev) {
    await db.prepare("UPDATE replay_jobs SET status = ? WHERE id = ?").bind("failed", jobId).run();
    return;
  }

  let method = String((ev as any).method).toUpperCase();
  if (method !== "POST" && method !== "PUT" && method !== "PATCH" && method !== "DELETE" && method !== "GET") {
    method = "POST";
  }

  const headersParsed = parseJsonSafe(String((ev as any).headers_json));
  let baseHeaders: any = {};
  if (headersParsed !== null) {
    baseHeaders = headersParsed;
  }

  let finalHeaders = applyHeaderOverrides(baseHeaders, headerOverrides);
  finalHeaders = cleanHeadersForFetch(finalHeaders);

  let contentType = "";
  if (typeof (ev as any).content_type === "string") {
    contentType = (ev as any).content_type;
  }
  if (contentType.length > 0) {
    if (!Object.prototype.hasOwnProperty.call(finalHeaders, "content-type")) {
      finalHeaders["content-type"] = contentType;
    }
  }

  let bodyText = "";
  let bodyJsonText = "";
  if (typeof (ev as any).body_text === "string") {
    bodyText = (ev as any).body_text;
  }
  if (typeof (ev as any).body_json === "string") {
    bodyJsonText = (ev as any).body_json;
  }

  let sendText = bodyText;

  let parsedBody = null;
  if (bodyJsonText.length > 0) {
    parsedBody = parseJsonSafe(bodyJsonText);
  }
  if (parsedBody !== null) {
    let mutated = parsedBody;
    for (const ov of jsonOverrides) {
      if (!ov) continue;
      if (typeof ov.path !== "string") continue;
      mutated = setPathValue(mutated, ov.path, ov.value);
    }
    sendText = JSON.stringify(mutated);
  }

  const now = Date.now();
  await db.prepare("UPDATE replay_jobs SET status = ?, last_run_at = ? WHERE id = ?").bind("running", now, jobId).run();

  let finalStatus = "failed";
  let lastError = "";
  let lastStatusCode = 0;

  let attemptNo = 1;
  while (attemptNo <= retryMax) {
    const startedAt = Date.now();

    let respStatus = 0;
    let respSnippet = "";
    let errMsg = "";
    let ok = 0;

    try {
      const opts: any = { method: method, headers: finalHeaders };

      if (methodAllowsBody(method)) {
        opts.body = sendText;
      }

      const resp = await fetch(destUrl, opts);
      respStatus = resp.status;
      lastStatusCode = respStatus;

      let txt = "";
      try {
        txt = await resp.text();
      } catch {
        txt = "";
      }

      respSnippet = snippet(txt, 400);
      if (respStatus >= 200 && respStatus <= 299) {
        ok = 1;
        finalStatus = "succeeded";
        lastError = "";
      }
    } catch (e: any) {
      let msg = "request_failed";
      if (e && e.message) {
        msg = e.message;
      }
      errMsg = String(msg);
      lastError = errMsg;
    }

    const finishedAt = Date.now();

    const attemptId = makeId("att");

    await db
      .prepare("INSERT INTO replay_attempts (id, job_id, attempt_no, started_at, finished_at, success, response_status, response_snippet, error_message, request_headers_json, request_body_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(attemptId, jobId, attemptNo, startedAt, finishedAt, ok, respStatus, respSnippet, errMsg, JSON.stringify(finalHeaders), sendText)
      .run();

    if (ok === 1) {
      break;
    }

    if (attemptNo < retryMax) {
      const delay = getBackoffDelay(attemptNo);
      if (delay > 0) {
        await sleepMs(delay);
      }
    }

    attemptNo = attemptNo + 1;
  }

  await db.prepare("UPDATE replay_jobs SET status = ?, last_run_at = ? WHERE id = ?").bind(finalStatus, Date.now(), jobId).run();
}

