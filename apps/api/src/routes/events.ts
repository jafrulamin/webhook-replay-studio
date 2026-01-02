import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

export const eventsRoute = new Hono<{ Bindings: Bindings }>();

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function bodyPreview(text: string) {
  let t = text;
  t = t.replaceAll("\n", " ");
  t = t.replaceAll("\r", " ");
  if (t.length > 180) {
    t = t.slice(0, 180);
  }
  return t;
}

eventsRoute.get("/api/inboxes/:inboxId/events", async (c) => {
  const inboxId = c.req.param("inboxId");

  const inbox = await c.env.DB.prepare(
    "SELECT id FROM inboxes WHERE id = ? LIMIT 1"
  )
    .bind(inboxId)
    .first();

  if (!inbox) {
    return c.json({ ok: false, error: "inbox_not_found" }, 404);
  }

  const result = await c.env.DB.prepare(
    "SELECT id, received_at, method, content_type, body_text FROM events WHERE inbox_id = ? ORDER BY received_at DESC LIMIT 50"
  )
    .bind(inboxId)
    .all();

  let rows: any[] = [];
  if (result && result.results) {
    rows = result.results as any[];
  }

  const events: any[] = [];
  for (const r of rows) {
    let bodyText = "";
    if (typeof r.body_text === "string") {
      bodyText = r.body_text;
    }

    events.push({
      id: r.id,
      receivedAt: new Date(r.received_at).toISOString(),
      method: r.method,
      contentType: r.content_type,
      bodyPreview: bodyPreview(bodyText)
    });
  }

  return c.json({ events: events });
});

eventsRoute.get("/api/events/:eventId", async (c) => {
  const eventId = c.req.param("eventId");

  const row = await c.env.DB.prepare(
    "SELECT id, inbox_id, received_at, method, path, query_json, headers_json, content_type, body_text, body_json, truncated FROM events WHERE id = ? LIMIT 1"
  )
    .bind(eventId)
    .first();

  if (!row) {
    return c.json({ ok: false, error: "event_not_found" }, 404);
  }

  const queryObj = safeJsonParse(String((row as any).query_json));
  const headersObj = safeJsonParse(String((row as any).headers_json));

  let queryFinal: any = {};
  if (queryObj !== null) queryFinal = queryObj;

  let headersFinal: any = {};
  if (headersObj !== null) headersFinal = headersObj;

  let jsonFinal: any = null;
  const bodyJsonText = (row as any).body_json;
  if (typeof bodyJsonText === "string" && bodyJsonText.length > 0) {
    jsonFinal = safeJsonParse(bodyJsonText);
  }

  let raw = "";
  if (typeof (row as any).body_text === "string") {
    raw = (row as any).body_text;
  }

  const event = {
    id: (row as any).id,
    inboxId: (row as any).inbox_id,
    receivedAt: new Date((row as any).received_at).toISOString(),
    method: (row as any).method,
    path: (row as any).path,
    query: queryFinal,
    headers: headersFinal,
    contentType: (row as any).content_type,
    body: {
      raw: raw,
      json: jsonFinal,
      isJson: jsonFinal !== null,
      truncated: (row as any).truncated === 1
    }
  };

  return c.json({ event: event });
});
