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

  // Safe Share state
  const [safeOn, setSafeOn] = useState(false);
  const [safeData, setSafeData] = useState<any>(null);
  const [copyMsg, setCopyMsg] = useState("");

  // Mutations preview state
  const [hdrOverridesText, setHdrOverridesText] = useState("[]");
  const [jsonOverridesText, setJsonOverridesText] = useState("[]");
  const [previewData, setPreviewData] = useState<any>(null);

  const hdrExample =
    '[{"action":"set","name":"x-demo","value":"changed"},{"action":"remove","name":"authorization"}]';
  const jsonExample =
    '[{"path":"n","value":999},{"path":"profile.apiKey","value":"demo"}]';

  // Replay Job state
  const [destUrl, setDestUrl] = useState("https://httpbin.org/post");
  const [jobId, setJobId] = useState("");
  const [jobInfo, setJobInfo] = useState<any>(null);
  const [compareData, setCompareData] = useState<any>(null);

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

  function parseJsonInput(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
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

    setSafeOn(false);
    setSafeData(null);
    setCopyMsg("");

    setPreviewData(null);
    setCompareData(null);

    setJobId("");
    setJobInfo(null);

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

    setSafeOn(false);
    setSafeData(null);
    setCopyMsg("");

    setPreviewData(null);
    setHdrOverridesText("[]");
    setJsonOverridesText("[]");

    setDestUrl("https://httpbin.org/post");
    setJobId("");
    setJobInfo(null);
    setCompareData(null);

    try {
      const res = await fetchWithTimeout(
        API_BASE + "/api/events/" + eventId,
        null,
        8000
      );

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

  async function loadSafe(eventId: string) {
    setBusy(true);
    setErr("");
    setCopyMsg("");

    try {
      const res = await fetchWithTimeout(
        API_BASE + "/api/events/" + eventId + "/safe",
        null,
        8000
      );
      if (!res.ok) {
        setErr("Failed to load safe share view");
        return;
      }

      const data = await res.json();
      setSafeData(data);
      setSafeOn(true);
    } catch {
      setErr("Network error loading safe share view");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string) {
    setCopyMsg("");

    try {
      if (!navigator) {
        setCopyMsg("Copy not available");
        return;
      }

      const clip: any = (navigator as any).clipboard;
      if (!clip) {
        setCopyMsg("Copy not available");
        return;
      }

      if (typeof clip.writeText !== "function") {
        setCopyMsg("Copy not available");
        return;
      }

      await clip.writeText(text);
      setCopyMsg("Copied");
    } catch {
      setCopyMsg("Copy failed");
    }
  }

  async function runPreview() {
    setErr("");
    setBusy(true);
    setPreviewData(null);

    if (!eventDetail) {
      setErr("No event selected");
      setBusy(false);
      return;
    }

    const hdr = parseJsonInput(hdrOverridesText);
    if (hdr === null) {
      setErr("Header overrides must be valid JSON");
      setBusy(false);
      return;
    }

    const jsn = parseJsonInput(jsonOverridesText);
    if (jsn === null) {
      setErr("JSON overrides must be valid JSON");
      setBusy(false);
      return;
    }

    if (!Array.isArray(hdr)) {
      setErr("Header overrides must be a JSON array");
      setBusy(false);
      return;
    }

    if (!Array.isArray(jsn)) {
      setErr("JSON overrides must be a JSON array");
      setBusy(false);
      return;
    }

    try {
      const res = await fetchWithTimeout(
        API_BASE + "/api/events/" + eventDetail.id + "/mutate-preview",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ headerOverrides: hdr, jsonOverrides: jsn })
        },
        8000
      );

      if (!res.ok) {
        const t = await res.text();
        setErr("Preview failed: " + t);
        return;
      }

      const data = await res.json();
      setPreviewData(data);
    } catch {
      setErr("Network error running preview");
    } finally {
      setBusy(false);
    }
  }

  async function loadJob(id: string) {
    setErr("");

    try {
      const res = await fetchWithTimeout(
        API_BASE + "/api/replay-jobs/" + id,
        null,
        8000
      );

      if (!res.ok) {
        setErr("Failed to load replay job");
        return;
      }

      const data = await res.json();
      setJobInfo(data);
    } catch {
      setErr("Network error loading replay job");
    }
  }

  async function createJobFromEvent() {
    setErr("");
    setBusy(true);
    setJobInfo(null);

    if (!eventDetail) {
      setErr("No event selected");
      setBusy(false);
      return;
    }

    const dest = destUrl.trim();
    if (dest.length === 0) {
      setErr("Destination URL is required");
      setBusy(false);
      return;
    }

    const hdr = parseJsonInput(hdrOverridesText);
    if (hdr === null) {
      setErr("Header overrides must be valid JSON");
      setBusy(false);
      return;
    }

    const jsn = parseJsonInput(jsonOverridesText);
    if (jsn === null) {
      setErr("JSON overrides must be valid JSON");
      setBusy(false);
      return;
    }

    if (!Array.isArray(hdr)) {
      setErr("Header overrides must be a JSON array");
      setBusy(false);
      return;
    }

    if (!Array.isArray(jsn)) {
      setErr("JSON overrides must be a JSON array");
      setBusy(false);
      return;
    }

    try {
      const res = await fetchWithTimeout(
        API_BASE + "/api/replay-jobs",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            eventId: eventDetail.id,
            destinationUrl: dest,
            headerOverrides: hdr,
            jsonOverrides: jsn,
            retry: { maxAttempts: 3, baseDelayMs: 300 }
          })
        },
        8000
      );

      if (!res.ok) {
        const t = await res.text();
        setErr("Create job failed: " + t);
        return;
      }

      const data = await res.json();

      if (data && data.job && typeof data.job.id === "string") {
        setJobId(data.job.id);
        await loadJob(data.job.id);
      }
    } catch {
      setErr("Network error creating replay job");
    } finally {
      setBusy(false);
    }
  }

  async function runJobNow() {
    setErr("");
    setBusy(true);

    if (jobId.length === 0) {
      setErr("No replay job created yet");
      setBusy(false);
      return;
    }

    try {
      const res = await fetchWithTimeout(
        API_BASE + "/api/replay-jobs/" + jobId + "/run",
        { method: "POST" },
        20000
      );

      if (!res.ok) {
        const t = await res.text();
        setErr("Run job failed: " + t);
        return;
      }

      await loadJob(jobId);
    } catch {
      setErr("Network error running replay job");
    } finally {
      setBusy(false);
    }
  }

  async function loadCompare(id: string) {
    setErr("");
    setBusy(true);
    setCompareData(null);

    try {
      const res = await fetchWithTimeout(API_BASE + "/api/replay-jobs/" + id + "/compare", null, 8000);
      if (!res.ok) {
        const t = await res.text();
        setErr("Compare failed: " + t);
        return;
      }
      const data = await res.json();
      setCompareData(data);
    } catch {
      setErr("Network error loading compare view");
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    setErr("");
    setCopyMsg("");

    if (view === "event") {
      setView("events");
      setEventDetail(null);

      setSafeOn(false);
      setSafeData(null);

      setPreviewData(null);
      setCompareData(null);

      setJobId("");
      setJobInfo(null);

      return;
    }

    if (view === "events") {
      setView("inboxes");
      setEvents([]);
      setActiveInbox(null);

      setSafeOn(false);
      setSafeData(null);

      setPreviewData(null);
      setCompareData(null);

      setJobId("");
      setJobInfo(null);

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

    let toolbar: any = null;

    if (eventDetail) {
      if (!safeOn) {
        toolbar = (
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => loadSafe(eventDetail.id)}
              disabled={busy}
              style={{ padding: "8px 12px" }}
            >
              Safe Share
            </button>
          </div>
        );
      } else {
        toolbar = (
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setSafeOn(false);
                setSafeData(null);
                setCopyMsg("");
              }}
              style={{ padding: "8px 12px" }}
            >
              Exit Safe Share
            </button>
          </div>
        );
      }
    }

    let usingSafe = false;
    let safeObj: any = null;

    if (safeOn) {
      if (safeData && safeData.safe) {
        usingSafe = true;
        safeObj = safeData.safe;
      }
    }

    let bodyBlock: any = (
      <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
        {"No body"}
      </pre>
    );

    if (usingSafe) {
      let rawSafe = "";
      if (safeObj && safeObj.body && typeof safeObj.body.raw === "string") {
        rawSafe = safeObj.body.raw;
      }

      bodyBlock = (
        <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
          {rawSafe}
        </pre>
      );
    } else {
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
    }

    let headersBlock: any = (
      <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
        {"No headers"}
      </pre>
    );

    if (usingSafe) {
      let h = {};
      if (safeObj && safeObj.headers) {
        h = safeObj.headers;
      }

      headersBlock = (
        <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
          {JSON.stringify(h, null, 2)}
        </pre>
      );
    } else {
      if (eventDetail) {
        headersBlock = (
          <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
            {JSON.stringify(eventDetail.headers, null, 2)}
          </pre>
        );
      }
    }

    let curlBlock: any = null;

    if (usingSafe) {
      if (safeObj && typeof safeObj.curl === "string") {
        curlBlock = (
          <div>
            <h3>Sanitized cURL</h3>
            <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
              {safeObj.curl}
            </pre>
            <button onClick={() => copyText(safeObj.curl)} style={{ padding: "8px 12px" }}>
              Copy sanitized cURL
            </button>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{copyMsg}</div>
          </div>
        );
      }
    }

    let mutationsBlock: any = null;

    if (!usingSafe) {
      let previewBlock = null;

      if (previewData) {
        previewBlock = (
          <div style={{ marginTop: 14 }}>
            <h4>Diff</h4>
            <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
              {JSON.stringify(previewData.diff, null, 2)}
            </pre>

            <h4>Preview Headers</h4>
            <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
              {JSON.stringify(previewData.preview.headers, null, 2)}
            </pre>

            <h4>Preview Body</h4>
            <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
              {previewData.preview.body.raw}
            </pre>
          </div>
        );
      }

      mutationsBlock = (
        <div style={{ marginTop: 18 }}>
          <h3>Mutations Preview</h3>

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
            Header overrides JSON example: <code>{hdrExample}</code>
          </div>
          <textarea
            value={hdrOverridesText}
            onChange={(e) => setHdrOverridesText(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          />

          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 12, marginBottom: 8 }}>
            JSON overrides JSON example: <code>{jsonExample}</code>
          </div>
          <textarea
            value={jsonOverridesText}
            onChange={(e) => setJsonOverridesText(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          />

          <div style={{ marginTop: 10 }}>
            <button onClick={runPreview} disabled={busy} style={{ padding: "8px 12px" }}>
              Preview Changes
            </button>
          </div>

          {previewBlock}
        </div>
      );
    }

    let replayBlock: any = null;

    if (!usingSafe) {
      let jobView: any = null;

      if (jobInfo && jobInfo.job) {
        jobView = (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Status: {jobInfo.job.status}
            </div>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Job ID: {jobInfo.job.id}
            </div>

            <h4 style={{ marginTop: 10 }}>Attempts</h4>

            <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
              {JSON.stringify(jobInfo.attempts, null, 2)}
            </pre>

            <button
              onClick={() => loadCompare(jobId)}
              disabled={busy}
              style={{ padding: "8px 12px", marginTop: 10 }}
            >
              Compare Last Attempt
            </button>
          </div>
        );
      }

      replayBlock = (
        <div style={{ marginTop: 18 }}>
          <h3>Replay Job</h3>

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
            Destination URL
          </div>

          <input
            value={destUrl}
            onChange={(e) => setDestUrl(e.target.value)}
            style={{ padding: 10, width: "100%", borderRadius: 8, border: "1px solid #ddd" }}
          />

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={createJobFromEvent} disabled={busy} style={{ padding: "8px 12px" }}>
              Create Replay Job
            </button>

            <button onClick={runJobNow} disabled={busy} style={{ padding: "8px 12px" }}>
              Run Job
            </button>
          </div>

          {jobView}

          {(() => {
            let compareBlock: any = null;

            if (compareData) {
              compareBlock = (
                <div style={{ marginTop: 12 }}>
                  <h4>Compare</h4>

                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Attempt #{compareData.attempt.attemptNo} Response {compareData.attempt.responseStatus}
                  </div>

                  <h4 style={{ marginTop: 10 }}>Diff</h4>
                  <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
                    {JSON.stringify(compareData.diff, null, 2)}
                  </pre>

                  <h4>Original Body</h4>
                  <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
                    {compareData.original.body.raw}
                  </pre>

                  <h4>Replay Body</h4>
                  <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
                    {compareData.replay.body.raw}
                  </pre>

                  <h4>Original Headers</h4>
                  <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
                    {JSON.stringify(compareData.original.headers, null, 2)}
                  </pre>

                  <h4>Replay Headers</h4>
                  <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, overflowX: "auto" }}>
                    {JSON.stringify(compareData.replay.headers, null, 2)}
                  </pre>
                </div>
              );
            }

            return compareBlock;
          })()}
        </div>
      );
    }

    let pathLine = "";
    if (eventDetail) pathLine = eventDetail.path;

    mainBlock = (
      <div>
        <h2>{title}</h2>
        {toolbar}

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
          {pathLine}
        </div>

        <h3>Body</h3>
        {bodyBlock}

        <h3>Headers</h3>
        {headersBlock}

        {curlBlock}
        {mutationsBlock}
        {replayBlock}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Webhook Replay Studio</h1>
      <p>Replay Jobs: create + run + attempts history</p>

      {backBlock}
      {errorBlock}
      {mainBlock}
    </div>
  );
}
