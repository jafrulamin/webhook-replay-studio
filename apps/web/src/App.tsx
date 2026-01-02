import { useEffect, useState } from "react";

type Inbox = {
  id: string;
  name: string;
  createdAt: string;
  webhookUrl: string;
};

export default function App() {
  const API_BASE = import.meta.env.VITE_API_BASE as string;

  const [name, setName] = useState("");
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadInboxes() {
    setErr("");
    const res = await fetch(API_BASE + "/api/inboxes");
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
  }

  async function createInbox() {
    setBusy(true);
    setErr("");

    const res = await fetch(API_BASE + "/api/inboxes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name })
    });

    if (!res.ok) {
      setErr("Failed to create inbox");
      setBusy(false);
      return;
    }

    setName("");
    await loadInboxes();
    setBusy(false);
  }

  useEffect(() => {
    loadInboxes();
  }, []);

  let errorBlock: JSX.Element | null = null;
  if (err.length > 0) {
    errorBlock = (
      <pre style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        {err}
      </pre>
    );
  }

  let listBlock: JSX.Element = <p>No inboxes yet.</p>;
  if (inboxes.length > 0) {
    const cards: JSX.Element[] = [];
    for (const ibx of inboxes) {
      cards.push(
        <div key={ibx.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>{ibx.name}</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>{ibx.id}</div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>Webhook URL</div>
          <code style={{ display: "block", padding: 8, background: "#f7f7f7", borderRadius: 8 }}>
            {ibx.webhookUrl}
          </code>
        </div>
      );
    }
    listBlock = <div style={{ display: "grid", gap: 10 }}>{cards}</div>;
  }

  let btnText = "Create Inbox";
  if (busy) {
    btnText = "Working...";
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900 }}>
      <h1>Webhook Replay Studio</h1>
      <p>Chunk 2: D1 + Inboxes</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Inbox name"
          style={{ padding: 10, flex: 1 }}
        />
        <button onClick={createInbox} disabled={busy} style={{ padding: "10px 14px" }}>
          {btnText}
        </button>
      </div>

      {errorBlock}

      <h2>Inboxes</h2>
      {listBlock}
    </div>
  );
}
