import { useEffect, useState } from "react";

type Inbox = {
  id: string;
  name: string;
  createdAt: string;
  webhookUrl: string;
};

type EventSummary = {
  id: string;
  receivedAt: string;
  method: string;
  contentType: string;
  bodyPreview: string;
};

type EventBody = {
  raw: string;
  json: any;
  isJson: boolean;
  truncated: boolean;
};

type EventDetail = {
  id: string;
  inboxId: string;
  receivedAt: string;
  method: string;
  path: string;
  query: any;
  headers: any;
  contentType: string;
  body: EventBody;
};

export default function App() {
  const API_BASE = import.meta.env.VITE_API_BASE as string;

  const [view, setView] = useState("inboxes");

  const [name, setName] = useState("");
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [activeInbox, setActiveInbox] = useState<Inbox | null>(null);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function fetchWithTimeout(url: string, options: any, timeoutMs: number) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const opts: any = options || {};
    opts.signal = controller.signal;

    try {
      return await fetch(url, opts);
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadInboxes() {
    setErr("");

    try {
      const res = await fetchWithTimeout(API_BASE + "/api/inboxes", null, 8000);
      if (!res.ok) {
        setErr("Failed to load inboxes");
        return;
      }

      const data = await res.json();

      let list: Inbox[] = [];
      if (data && data.inboxes) {
        list = data.inboxes as Inbox[];
      }
      setInboxes(list);
    } catch {
      setErr("Network error loading inboxes");
    }
  }

  async function createInbox() {
    setBusy(true);
    setErr("");

    try {
      const res = await fetchWithTimeout(
        API_BASE + "/api/inboxes",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: name })
        },
        8000
      );

      if (!res.ok) {
        setErr("Failed to create inbox");
        return;
      }

      setName("");
      await loadInboxes();
    } catch {
      setErr("Network error creating inbox");
    } finally {
      setBusy(false);
    }
  }

  async function openEvents(inbox: Inbox) {
    setBusy(true);
    setErr("");
    setEventDetail(null);

    try {
      const res = await fetchWithTimeout(
        API_BASE + "/api/inboxes/" + inbox.id + "/events",
        null,
        8000
      );

      if (!res.ok) {
        setErr("Failed to load events");
        return;
      }

      const data = await res.json();

      let list: EventSummary[] = [];
      if (data && data.events) {
        list = data.events as EventSummary[];
      }

      setActiveInbox(inbox);
      setEvents(list);
      setView("events");
    } catch {
      setErr("Network error loading events");
    } finally {
      setBusy(false);
    }
  }

  async function openEvent(eventId: string) {
    setBusy(true);
    setErr("");

    try {
      const res = await fetchWithTimeout(API_BASE + "/api/events/" + eventId, null, 8000);

      if (!res.ok) {
        setErr("Failed to load event detail");
        return;
      }

      const data = await res.json();

      let detail: EventDetail | null = null;
      if (data && data.event) {
        detail = data.event as EventDetail;
      }

      setEventDetail(detail);
      setView("event");
    } catch {
      setErr("Network error loading event detail");
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    setErr("");

    if (view === "event") {
      setView("events");
      setEventDetail(null);
      return;
    }

    if (view === "events") {
      setView("inboxes");
      setEvents([]);
      setActiveInbox(null);
      return;
    }

    setView("inboxes");
  }

  useEffect(() => {
    loadInboxes();
  }, []);

  let errorBlock: any = null;
  if (err.length > 0) {
    errorBlock = (
      <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        {err}
      </pre>
    );
  }

  let backBlock: any = null;
  if (view !== "inboxes") {
    backBlock = (
      <button onClick={goBack} style={{ padding: "8px 12px", marginBottom: 12 }}>
        Back
      </button>
    );
  }

  let mainBlock: any = <div />;

  if (view === "inboxes") {
    let btnText = "Create Inbox";
    if (busy) btnText = "Working...";

    let listBlock: any = <p>No inboxes yet.</p>;
    if (inboxes.length > 0) {
      const cards: any[] = [];
      for (const ibx of inboxes) {
        cards.push(
          <div key={ibx.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{ibx.name}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>{ibx.id}</div>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>Webhook URL</div>
            <code style={{ display: "block", padding: 8, background: "#555962ff", borderRadius: 8 }}>
              {ibx.webhookUrl}
            </code>

            <div style={{ marginTop: 10 }}>
              <button onClick={() => openEvents(ibx)} style={{ padding: "8px 12px" }}>
                Open Events
              </button>
            </div>
          </div>
        );
      }
      listBlock = <div style={{ display: "grid", gap: 10 }}>{cards}</div>;
    }

    mainBlock = (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) {
                createInbox();
              }
            }}
            placeholder="Inbox name"
            style={{ padding: 10, flex: 1 }}
          />
          <button onClick={createInbox} disabled={busy} style={{ padding: "10px 14px" }}>
            {btnText}
          </button>
        </div>

        <h2>Inboxes</h2>
        {listBlock}
      </div>
    );
  }

  if (view === "events") {
    let title = "Events";
    if (activeInbox) title = activeInbox.name + " Events";

    let listBlock: any = <p>No events yet. Send a webhook to this inbox.</p>;
    if (events.length > 0) {
      const cards: any[] = [];
      for (const ev of events) {
        cards.push(
          <div key={ev.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 700 }}>{ev.method}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{ev.receivedAt}</div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{ev.contentType}</div>

            <code style={{ display: "block", padding: 8, background: "#f7f7f7", borderRadius: 8, marginTop: 8 }}>
              {ev.bodyPreview}
            </code>

            <div style={{ marginTop: 10 }}>
              <button onClick={() => openEvent(ev.id)} style={{ padding: "8px 12px" }}>
                View Event
              </button>
            </div>
          </div>
        );
      }
      listBlock = <div style={{ display: "grid", gap: 10 }}>{cards}</div>;
    }

    mainBlock = (
      <div>
        <h2>{title}</h2>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
          Tip: Send a webhook, then click Back and open events again to refresh.
        </div>
        {listBlock}
      </div>
    );
  }

  if (view === "event") {
    let title = "Event Detail";
    if (eventDetail) title = eventDetail.method + " " + eventDetail.receivedAt;

    let bodyBlock: any = (
      <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
        {"No body"}
      </pre>
    );

    if (eventDetail) {
      if (eventDetail.body && eventDetail.body.isJson) {
        bodyBlock = (
          <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
            {JSON.stringify(eventDetail.body.json, null, 2)}
          </pre>
        );
      } else {
        bodyBlock = (
          <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
            {eventDetail.body.raw}
          </pre>
        );
      }
    }

    let headersBlock: any = (
      <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
        {"No headers"}
      </pre>
    );

    if (eventDetail) {
      headersBlock = (
        <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
          {JSON.stringify(eventDetail.headers, null, 2)}
        </pre>
      );
    }

    let pathLine = "";
    if (eventDetail) pathLine = eventDetail.path;

    mainBlock = (
      <div>
        <h2>{title}</h2>

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
          {pathLine}
        </div>

        <h3>Body</h3>
        {bodyBlock}

        <h3>Headers</h3>
        {headersBlock}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Webhook Replay Studio</h1>
      <p>Chunk 3 UI: Inboxes → Events → Event Detail</p>

      {backBlock}
      {errorBlock}
      {mainBlock}
    </div>
  );
}
