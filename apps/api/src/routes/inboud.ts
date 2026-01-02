import { Hono } from "hono";
import { makeId } from "../utils/ids";

type Bindings = {
  DB: D1Database;
};

export const inboundRoute = new Hono<{ Bindings: Bindings }>();

function hasOwn(obj: any, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function addMulti(map: any, key: string, value: string) {
  if (hasOwn(map, key)) {
    const prev = map[key];
    if (Array.isArray(prev)) {
      prev.push(value);
      map[key] = prev;
      return;
    }
    map[key] = [prev, value];
    return;
  }
  map[key] = value;
}

function headersToObject(h: Headers) {
  const out: any = {};
  for (const pair of h.entries()) {
    const k = String(pair[0]).toLowerCase();
    const v = String(pair[1]);
    addMulti(out, k, v);
  }
  return out;
}

function queryToObject(u: URL) {
  const out: any = {};
  for (const pair of u.searchParams.entries()) {
    const k = String(pair[0]);
    const v = String(pair[1]);
    addMulti(out, k, v);
  }
  return out;
}

function safeParseJson(text: string) {
  const t = text.trim();
  if (t.length === 0) return { ok: false, value: null };

  const first = t[0];
  if (first !== "{" && first !== "[") return { ok: false, value: null };

  try {
    const val = JSON.parse(t);
    return { ok: true, value: val };
  } catch {
    return { ok: false, value: null };
  }
}

function getContentType(headersObj: any) {
  if (!hasOwn(headersObj, "content-type")) return "";
  const v = headersObj["content-type"];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0) return String(v[0]);
  return "";
}

inboundRoute.all("/i/:inboxId", async (c) => {
  const inboxId = c.req.param("inboxId");

  const inbox = await c.env.DB.prepare(
    "SELECT id FROM inboxes WHERE id = ? LIMIT 1"
  )
    .bind(inboxId)
    .first();

  if (!inbox) {
    return c.json({ ok: false, error: "inbox_not_found" }, 404);
  }

  const url = new URL(c.req.url);

  const method = c.req.method;

  let path = url.pathname;
  if (url.search.length > 0) {
    path = path + url.search;
  }

  const queryObj = queryToObject(url);
  const headersObj = headersToObject(c.req.raw.headers);
  const contentType = getContentType(headersObj);

  let bodyText = "";
  try {
    bodyText = await c.req.text();
  } catch {
    bodyText = "";
  }

  const maxLen = 200000;
  let truncated = 0;
  if (bodyText.length > maxLen) {
    bodyText = bodyText.slice(0, maxLen);
    truncated = 1;
  }

  let bodyJsonString: string | null = null;
  const parsed = safeParseJson(bodyText);
  if (parsed.ok) {
    try {
      bodyJsonString = JSON.stringify(parsed.value);
    } catch {
      bodyJsonString = null;
    }
  }

  const id = makeId("evt");
  const receivedAt = Date.now();

  await c.env.DB.prepare(
    "INSERT INTO events (id, inbox_id, received_at, method, path, query_json, headers_json, content_type, body_text, body_json, truncated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(
      id,
      inboxId,
      receivedAt,
      method,
      path,
      JSON.stringify(queryObj),
      JSON.stringify(headersObj),
      contentType,
      bodyText,
      bodyJsonString,
      truncated
    )
    .run();

  return c.json(
    {
      ok: true,
      eventId: id,
      receivedAt: new Date(receivedAt).toISOString()
    },
    202
  );
});
