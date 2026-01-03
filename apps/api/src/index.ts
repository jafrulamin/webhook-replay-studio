import { Hono } from "hono";
import { makeId } from "./utils/ids";
import { inboundRoute } from "./routes/inboud";
import { eventsRoute } from "./routes/events";

type Bindings = {
  DB: D1Database;
  PUBLIC_API_BASE: string;
  APP_ORIGIN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.onError((err, c) => {
  return c.json({ error: "Internal server error", message: err.message }, 500);
});

function applyCors(c: any) {
  const allowed = c.env.APP_ORIGIN;

  let origin = "http://localhost:5173";
  if (typeof allowed === "string" && allowed.length > 0) {
    origin = allowed;
  }

  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "content-type");
}

app.options("/api/*", (c) => {
  applyCors(c);
  return c.body(null, 204);
});

app.use("/api/*", async (c, next) => {
  applyCors(c);
  await next();
});

app.get("/api/health", (c) => {
  return c.json({
    ok: true,
    name: "webhook-replay-studio-api",
    ts: new Date().toISOString()
  });
});

function getBaseUrl(c: any) {
  const base = c.env.PUBLIC_API_BASE;

  if (typeof base === "string" && base.length > 0) {
    return base;
  }

  return new URL(c.req.url).origin;
}

app.post("/api/inboxes", async (c) => {
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  let name = "New Inbox";
  if (body && typeof body.name === "string") {
    const t = body.name.trim();
    if (t.length > 0) {
      name = t;
    }
  }

  const id = makeId("ibx");
  const createdAt = Date.now();

  await c.env.DB.prepare(
    "INSERT INTO inboxes (id, name, created_at) VALUES (?, ?, ?)"
  )
    .bind(id, name, createdAt)
    .run();

  const base = getBaseUrl(c);

  return c.json(
    {
      inbox: {
        id: id,
        name: name,
        createdAt: new Date(createdAt).toISOString(),
        webhookUrl: base + "/i/" + id
      }
    },
    201
  );
});

app.get("/api/inboxes", async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT id, name, created_at FROM inboxes ORDER BY created_at DESC LIMIT 50"
  ).all();

  let rows: any[] = [];
  if (result && result.results) {
    rows = result.results as any[];
  }

  const base = getBaseUrl(c);

  const inboxes: any[] = [];
  for (const r of rows) {
    inboxes.push({
      id: r.id,
      name: r.name,
      createdAt: new Date(r.created_at).toISOString(),
      webhookUrl: base + "/i/" + r.id
    });
  }

  return c.json({ inboxes: inboxes });
});

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isSensitiveHeaderName(name: string) {
  const n = name.toLowerCase();

  if (n === "authorization") {
    return true;
  } 
  else if (n === "cookie") {
    return true;
  } 
  else if (n === "set-cookie") {
    return true;
  } 
  else if (n === "x-api-key") {
    return true;
  } 
  else if (n === "api-key") {
    return true;
  } 
  else if (n === "x-auth-token") {
    return true;
  } 
  else {
    return false;
  }
}


function isSensitiveKeyName(name: string) {
  const n = name.toLowerCase();

  if (n.indexOf("token") >= 0) {
    return true;
  } 
  else if (n.indexOf("secret") >= 0) {
    return true;
  } 
  else if (n.indexOf("password") >= 0) {
    return true;
  } 
  else if (n.indexOf("api_key") >= 0) {
    return true;
  } 
  else if (n.indexOf("apikey") >= 0) {
    return true;
  } 
  else if (n.indexOf("authorization") >= 0) {
    return true;
  } 
  else if (n.indexOf("cookie") >= 0) {
    return true;
  } 
  else if (n.indexOf("session") >= 0) {
    return true;
  } 
  else {
    return false;
  }
}


function redactHeaders(headersObj: any) {
  const out: any = {};
  const keys = Object.keys(headersObj);

  for (const k of keys) {
    const v = headersObj[k];
    if (isSensitiveHeaderName(k)) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = v;
    }
  }

  return out;
}

function redactString(s: string) {
  let t = s;

  t = t.replaceAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]");
  t = t.replaceAll(/[A-Za-z0-9_-]{24,}/g, "[REDACTED_TOKEN]");
  t = t.replaceAll(/Bearer [A-Za-z0-9._-]+/g, "Bearer [REDACTED_TOKEN]");

  return t;
}

function redactJsonValue(value: any) {
  if (value === null) return null;

  const t = typeof value;

  if (t === "string") {
    return redactString(value);
  }

  if (t === "number") return value;
  if (t === "boolean") return value;

  if (Array.isArray(value)) {
    const arr: any[] = [];
    for (const item of value) {
      arr.push(redactJsonValue(item));
    }
    return arr;
  }

  if (t === "object") {
    const obj: any = {};
    const keys = Object.keys(value);
    for (const k of keys) {
      if (isSensitiveKeyName(k)) {
        obj[k] = "[REDACTED]";
      } else {
        obj[k] = redactJsonValue((value as any)[k]);
      }
    }
    return obj;
  }

  return value;
}

function escapeSingleQuotes(s: string) {
  return s.replaceAll("'", "'\"'\"'");
}

function buildSanitizedCurl(method: string, url: string, headersObj: any, bodyText: string) {
  const parts: string[] = [];
  parts.push("curl");
  parts.push("-X");
  parts.push(method);

  const headerKeys = Object.keys(headersObj);
  for (const k of headerKeys) {
    const v = headersObj[k];

    if (typeof v === "string") {
      parts.push("-H");
      parts.push("'" + escapeSingleQuotes(k + ": " + v) + "'");
    } else if (Array.isArray(v)) {
      for (const item of v) {
        parts.push("-H");
        parts.push("'" + escapeSingleQuotes(k + ": " + String(item)) + "'");
      }
    }
  }

  if (bodyText.length > 0) {
    parts.push("--data");
    parts.push("'" + escapeSingleQuotes(bodyText) + "'");
  }

  parts.push("'" + escapeSingleQuotes(url) + "'");
  return parts.join(" ");
}

app.get("/api/events/:eventId/safe", async (c) => {
  const eventId = c.req.param("eventId");

  const row = await c.env.DB.prepare(
    "SELECT id, inbox_id, received_at, method, path, query_json, headers_json, content_type, body_text, body_json, truncated FROM events WHERE id = ? LIMIT 1"
  )
    .bind(eventId)
    .first();

  if (!row) {
    return c.json({ ok: false, error: "event_not_found" }, 404);
  }

  const r: any = row;

  const headersParsed = safeJsonParse(String(r.headers_json));
  let headers: any = {};
  if (headersParsed !== null) {
    headers = headersParsed;
  }

  const safeHeaders = redactHeaders(headers);

  let rawBody = "";
  if (typeof r.body_text === "string") {
    rawBody = r.body_text;
  }

  let isJson = false;
  let safeJson: any = null;
  let safeRaw = "";

  if (typeof r.body_json === "string" && r.body_json.length > 0) {
    const parsed = safeJsonParse(r.body_json);
    if (parsed !== null) {
      isJson = true;
      safeJson = redactJsonValue(parsed);
      safeRaw = JSON.stringify(safeJson, null, 2);
    }
  }

  if (!isJson) {
    safeRaw = redactString(rawBody);
  }

  const base = getBaseUrl(c);

  let url = base;
  if (typeof r.path === "string") {
    url = base + r.path;
  }

  let method = "POST";
  if (typeof r.method === "string" && r.method.length > 0) {
    method = r.method;
  }

  const curlCmd = buildSanitizedCurl(method, url, safeHeaders, safeRaw);

  const payload = {
    eventId: r.id,
    inboxId: r.inbox_id,
    receivedAt: new Date(r.received_at).toISOString(),
    method: method,
    url: url,
    headers: safeHeaders,
    body: {
      raw: safeRaw,
      json: safeJson,
      isJson: isJson,
      truncated: r.truncated === 1
    },
    curl: curlCmd
  };

  return c.json({ safe: payload });
});


function normalizeHeaderName(name: string) {
  return name.trim().toLowerCase();
}

function parseJsonSafe(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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
      if (typeof item.value === "string") value = item.value;
      else value = toStringValue(item.value);

      out[name] = value;
      continue;
    }
  }

  return out;
}

function diffHeaders(beforeObj: any, afterObj: any) {
  const beforeKeys = Object.keys(beforeObj);
  const afterKeys = Object.keys(afterObj);

  const beforeSet: any = {};
  for (const k of beforeKeys) beforeSet[k] = true;

  const afterSet: any = {};
  for (const k of afterKeys) afterSet[k] = true;

  const added: any[] = [];
  const removed: any[] = [];
  const changed: any[] = [];

  for (const k of afterKeys) {
    if (!beforeSet[k]) {
      added.push({ name: k, value: afterObj[k] });
    }
  }

  for (const k of beforeKeys) {
    if (!afterSet[k]) {
      removed.push({ name: k, value: beforeObj[k] });
    }
  }

  for (const k of afterKeys) {
    if (beforeSet[k]) {
      const a = afterObj[k];
      const b = beforeObj[k];

      const aStr = toStringValue(a);
      const bStr = toStringValue(b);

      if (aStr !== bStr) {
        changed.push({ name: k, before: b, after: a });
      }
    }
  }

  return { added: added, removed: removed, changed: changed };
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

function flattenJson(value: any, prefix: string, out: any) {
  if (value === null) {
    out[prefix] = "null";
    return;
  }

  const t = typeof value;

  if (t === "string" || t === "number" || t === "boolean") {
    out[prefix] = toStringValue(value);
    return;
  }

  if (Array.isArray(value)) {
    let idx = 0;
    for (const item of value) {
      let key = String(idx);
      if (prefix.length > 0) {
        key = prefix + "." + String(idx);
      }
      flattenJson(item, key, out);
      idx = idx + 1;
    }
    return;
  }

  if (t === "object") {
    const keys = Object.keys(value);
    for (const k of keys) {
      let key = k;
      if (prefix.length > 0) {
        key = prefix + "." + k;
      }
      flattenJson(value[k], key, out);
    }
    return;
  }

  out[prefix] = toStringValue(value);
}

function diffJson(beforeJson: any, afterJson: any) {
  const beforeFlat: any = {};
  const afterFlat: any = {};

  flattenJson(beforeJson, "", beforeFlat);
  flattenJson(afterJson, "", afterFlat);

  const beforeKeys = Object.keys(beforeFlat);
  const afterKeys = Object.keys(afterFlat);

  const beforeSet: any = {};
  for (const k of beforeKeys) beforeSet[k] = true;

  const afterSet: any = {};
  for (const k of afterKeys) afterSet[k] = true;

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const k of afterKeys) {
    if (!beforeSet[k]) added.push(k);
  }

  for (const k of beforeKeys) {
    if (!afterSet[k]) removed.push(k);
  }

  for (const k of afterKeys) {
    if (beforeSet[k]) {
      if (afterFlat[k] !== beforeFlat[k]) changed.push(k);
    }
  }

  return { added: added, removed: removed, changed: changed };
}

app.post("/api/events/:eventId/mutate-preview", async (c) => {
  const eventId = c.req.param("eventId");

  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  let headerOverrides: any[] = [];
  if (body && Array.isArray(body.headerOverrides)) {
    headerOverrides = body.headerOverrides;
  }

  let jsonOverrides: any[] = [];
  if (body && Array.isArray(body.jsonOverrides)) {
    jsonOverrides = body.jsonOverrides;
  }

  const row = await c.env.DB.prepare(
    "SELECT id, inbox_id, received_at, method, path, headers_json, body_text, body_json FROM events WHERE id = ? LIMIT 1"
  )
    .bind(eventId)
    .first();

  if (!row) {
    return c.json({ ok: false, error: "event_not_found" }, 404);
  }

  const headersParsed = parseJsonSafe(String((row as any).headers_json));
  let headersObj: any = {};
  if (headersParsed !== null) headersObj = headersParsed;

  const beforeHeaders = headersObj;
  const afterHeaders = applyHeaderOverrides(beforeHeaders, headerOverrides);
  const headersDiff = diffHeaders(beforeHeaders, afterHeaders);

  let isJson = false;
  let beforeJson: any = null;

  const bodyJsonText = (row as any).body_json;
  if (typeof bodyJsonText === "string" && bodyJsonText.length > 0) {
    const parsed = parseJsonSafe(bodyJsonText);
    if (parsed !== null) {
      isJson = true;
      beforeJson = parsed;
    }
  }

  if (!isJson) {
    return c.json(
      {
        ok: false,
        error: "body_not_json",
        message: "This preview only supports JSON bodies for JSON overrides."
      },
      400
    );
  }

  let afterJson: any = beforeJson;
  for (const ov of jsonOverrides) {
    if (!ov) continue;
    if (typeof ov.path !== "string") continue;
    afterJson = setPathValue(afterJson, ov.path, ov.value);
  }

  const jsonDiff = diffJson(beforeJson, afterJson);

  const preview = {
    headers: afterHeaders,
    body: {
      isJson: true,
      json: afterJson,
      raw: JSON.stringify(afterJson, null, 2)
    }
  };

  const diff = {
    headers: headersDiff,
    json: jsonDiff
  };

  return c.json({ preview: preview, diff: diff });
});




app.route("/", inboundRoute);
app.route("/", eventsRoute);



export default app;
