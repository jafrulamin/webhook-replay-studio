import { useEffect, useState, useRef } from "react";

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
  const inboxesRef = useRef<Inbox[]>([]);
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
  const [replayDest, setReplayDest] = useState("https://postman-echo.com/post");
  const [replayRetryMax, setReplayRetryMax] = useState("3");
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [jobDetail, setJobDetail] = useState<any>(null);
  const [jobAttempts, setJobAttempts] = useState<any[]>([]);
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
        setInboxes([]);
        return [];
      }

      const data = await res.json();

      let list: Inbox[] = [];
      if (data && data.inboxes) {
        list = data.inboxes as Inbox[];
      }
      setInboxes(list);
      inboxesRef.current = list;
      return list;
    } catch {
      setErr("Network error loading inboxes");
      setInboxes([]);
      inboxesRef.current = [];
      return [];
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

    setReplayDest("https://postman-echo.com/post");
    setReplayRetryMax("3");
    setJobs([]);
    setSelectedJobId("");
    setJobDetail(null);
    setJobAttempts([]);

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
      window.location.hash = "events/" + inbox.id;
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

    setReplayDest("https://postman-echo.com/post");
    setReplayRetryMax("3");
    setJobs([]);
    setSelectedJobId("");
    setJobDetail(null);
    setJobAttempts([]);
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
      window.location.hash = "event/" + eventId;

      if (detail) {
        await loadReplayJobs(detail.id);
      }
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

  async function loadReplayJobs(eventId: string) {
    setErr("");

    try {
      const res = await fetchWithTimeout(
        API_BASE + "/api/events/" + eventId + "/replay-jobs",
        null,
        8000
      );

      if (!res.ok) {
        setErr("Failed to load replay jobs");
        return;
      }

      const data = await res.json();
      let jobsList: any[] = [];
      if (data && data.jobs && Array.isArray(data.jobs)) {
        jobsList = data.jobs;
      }
      setJobs(jobsList);
    } catch {
      setErr("Network error loading replay jobs");
    }
  }

  async function createReplayJob(eventId: string) {
    setErr("");
    setBusy(true);

    const dest = replayDest.trim();
    if (dest.length === 0) {
      setErr("Destination URL is required");
      setBusy(false);
      return;
    }

    let retryMaxNum = 3;
    const retryMaxText = replayRetryMax.trim();
    if (retryMaxText.length > 0) {
      const parsed = parseInt(retryMaxText, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
        retryMaxNum = parsed;
      }
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
        API_BASE + "/api/events/" + eventId + "/replay-jobs",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            destinationUrl: dest,
            headerOverrides: hdr,
            jsonOverrides: jsn,
            retryMax: retryMaxNum
          })
        },
        8000
      );

      if (!res.ok) {
        const t = await res.text();
        setErr("Create job failed: " + t);
        setBusy(false);
        return;
      }

      await loadReplayJobs(eventId);
    } catch (e: any) {
      let msg = "Network error creating replay job";
      if (e && e.message) {
        msg = msg + ": " + e.message;
      }
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function loadReplayJobDetail(jobId: string) {
    setErr("");
    setBusy(true);

    try {
      const res = await fetchWithTimeout(
        API_BASE + "/api/replay-jobs/" + jobId,
        null,
        8000
      );

      if (!res.ok) {
        const t = await res.text();
        setErr("Failed to load replay job detail: " + t);
        setBusy(false);
        return;
      }

      const data = await res.json();
      if (data && data.job) {
        setJobDetail(data.job);
        let attemptsList: any[] = [];
        if (data.attempts && Array.isArray(data.attempts)) {
          attemptsList = data.attempts;
        }
        setJobAttempts(attemptsList);
      } else {
        setErr("Invalid response: missing job data");
      }
    } catch (e: any) {
      let msg = "Network error loading replay job detail";
      if (e && e.message) {
        msg = msg + ": " + e.message;
      }
      setErr(msg);
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


  useEffect(() => {
    async function init() {
      const loadedInboxes = await loadInboxes();

      const hash = window.location.hash.slice(1);
      const parts = hash.split("/");

      if (parts[0] === "events" && parts.length === 2) {
        const inboxId = parts[1];
        const inbox = loadedInboxes.find((ibx) => ibx.id === inboxId);
        if (inbox) {
          await openEvents(inbox);
        }
      } else if (parts[0] === "event" && parts.length === 2) {
        const eventId = parts[1];
        await openEvent(eventId);
      } else if (hash === "inboxes" || hash === "") {
        setView("inboxes");
        window.location.hash = "inboxes";
      }
    }

    init();

    async function handleHashChange() {
      const hash = window.location.hash.slice(1);
      const parts = hash.split("/");

      if (parts[0] === "events" && parts.length === 2) {
        const inboxId = parts[1];
        let inbox = inboxesRef.current.find((ibx) => ibx.id === inboxId);
        if (!inbox) {
          const loaded = await loadInboxes();
          inbox = loaded.find((ibx) => ibx.id === inboxId);
        }
        if (inbox) {
          await openEvents(inbox);
        }
      } else if (parts[0] === "event" && parts.length === 2) {
        const eventId = parts[1];
        await openEvent(eventId);
      } else if (hash === "inboxes" || hash === "") {
        setView("inboxes");
      }
    }

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  let errorBlock: any = null;
  if (err.length > 0) {
    errorBlock = (
      <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        {err}
      </pre>
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
      let jobsListBlock: any = null;
      if (jobs.length > 0) {
        const jobCards: any[] = [];
        for (const job of jobs) {
          const isSelected = selectedJobId === job.id;
          const showDetails = isSelected && jobDetail;

          let jobDetailsBlock: any = null;
          if (showDetails) {
            let attemptsBlock: any = null;
            if (jobAttempts.length > 0) {
              const attemptItems: any[] = [];
              for (const att of jobAttempts) {
                attemptItems.push(
                  <div key={att.id} style={{ border: "1px solid #d59b9bff", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Attempt #{att.attemptNo}</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                      Status: {att.responseStatus} | OK: {(() => {
                        if (att.ok) return "Yes";
                        return "No";
                      })()} | Started: {new Date(att.startedAt).toLocaleString()}
                    </div>
                    {att.errorMessage && att.errorMessage.length > 0 && (
                      <div style={{ fontSize: 12, color: "#d00", marginTop: 4 }}>Error: {att.errorMessage}</div>
                    )}
                    {att.responseSnippet && att.responseSnippet.length > 0 && (
                      <pre style={{ fontSize: 11, padding: 8, background: "#f5f5f5", borderRadius: 4, marginTop: 6, overflowX: "auto" }}>
                        {att.responseSnippet}
                      </pre>
                    )}
                  </div>
                );
              }
              attemptsBlock = (
                <div style={{ marginTop: 12 }}>
                  <h4>Attempts ({jobAttempts.length})</h4>
                  {attemptItems}
                </div>
              );
            }

            jobDetailsBlock = (
              <div style={{ marginTop: 12, border: "1px solid #ccc", borderRadius: 8, padding: 12, position: "relative" }}>
                <button
                  onClick={() => {
                    setSelectedJobId("");
                    setJobDetail(null);
                    setJobAttempts([]);
                  }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "#464158ff",
                    border: "1px solid #ddd",
                    borderRadius: "50%",
                    width: 24,
                    height: 24,
                    cursor: "pointer",
                    fontSize: 16,
                    lineHeight: 1,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ×
                </button>
                <h4 style={{ marginTop: 0, marginBottom: 8 }}>Job Details</h4>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>ID: {jobDetail.id}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Status: {jobDetail.status}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Destination: {jobDetail.destinationUrl}</div>
                {attemptsBlock}
                <button
                  onClick={() => loadCompare(selectedJobId)}
                  disabled={busy}
                  style={{ padding: "8px 12px", marginTop: 10 }}
                >
                  Compare Last Attempt
                </button>
              </div>
            );
          }

          jobCards.push(
            <div key={job.id} style={{ marginBottom: 8 }}>
              <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Job {job.id.slice(0, 12)}...</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  Status: {job.status} | Retry Max: {job.retryMax} | Created: {new Date(job.createdAt).toLocaleString()}
                </div>
                {!showDetails && (
                  <button
                    onClick={async () => {
                      setSelectedJobId(job.id);
                      await loadReplayJobDetail(job.id);
                    }}
                    disabled={busy}
                    style={{ padding: "6px 10px", marginTop: 8, fontSize: 12 }}
                  >
                    Open Job
                  </button>
                )}
              </div>
              {jobDetailsBlock}
            </div>
          );
        }
        jobsListBlock = (
          <div style={{ marginTop: 12 }}>
            <h4>Jobs ({jobs.length})</h4>
            {jobCards}
          </div>
        );
      }

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

      replayBlock = (
        <div style={{ marginTop: 18 }}>
          <h3>Replay Job</h3>

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
            Destination URL
          </div>
          <input
            value={replayDest}
            onChange={(e) => setReplayDest(e.target.value)}
            style={{ padding: 10, width: "100%", borderRadius: 8, border: "1px solid #ddd" }}
          />

          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10, marginBottom: 6 }}>
            Retry Max (1-5)
          </div>
          <input
            value={replayRetryMax}
            onChange={(e) => setReplayRetryMax(e.target.value)}
            style={{ padding: 10, width: "100%", borderRadius: 8, border: "1px solid #ddd" }}
          />

          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => {
                if (eventDetail) {
                  createReplayJob(eventDetail.id);
                }
              }}
              disabled={busy}
              style={{ padding: "8px 12px" }}
            >
              Create Replay Job
            </button>
          </div>

          {jobsListBlock}
          {compareBlock}
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

  function goHome() {
    setView("inboxes");
    window.location.hash = "inboxes";
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1
        onClick={goHome}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        Webhook Replay Studio
      </h1>
      <p>Replay Jobs: create + run + attempts history</p>

      {errorBlock}
      {mainBlock}
    </div>
  );
}
