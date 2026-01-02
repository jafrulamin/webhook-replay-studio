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
  const origin = typeof allowed === "string" && allowed.length > 0 ? allowed : "http://localhost:5173";
  
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

app.route("/", inboundRoute);
app.route("/", eventsRoute);

export default app;
