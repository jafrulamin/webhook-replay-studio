# Webhook Replay Studio

Webhook Replay Studio is a developer tool to debug webhooks using a real workflow:

**Capture → Inspect → Sanitize → Replay → Compare**

This is not a request-bin clone. The main feature is **Replay Jobs** with mutations, retries, attempt history, and a compare view.

---

## Why it stands out

### Replay Jobs are first-class
Replays are not a one-off resend. Each replay creates a **Job** with:
- destination URL
- mutation config (header overrides + JSON overrides)
- retry policy (1–5 attempts with exponential backoff)
- attempt history and final status

### Mutations + Diff
Before replay, you can safely edit payloads by rules:
- header overrides (set or remove)
- JSON overrides by path (example: `profile.apiKey`)

Then you can preview the replay payload and see a diff summary.

### Safe Share (privacy-first)
Safe Share redacts secrets and common PII by default and generates a **sanitized cURL** you can paste into tickets or share with teammates.

### Compare
After a replay runs, you can compare:
- original event payload and headers
- the replay attempt request payload and headers
- diff summary

---

## 2-minute demo script

1. Create an inbox.
2. Copy the webhook URL.
3. Send a webhook:

```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer secret123" \
  -d '{"user":{"id":42,"email":"test@example.com"},"action":"signup"}'
```

4. Click the event to inspect headers and body.
5. Open **Safe Share** – see how `Authorization` and `email` are redacted.
6. Add mutations:
   - Set header `X-Debug: true`
   - Change `user.id` to `999`
7. Preview the diff.
8. Create a replay job with destination `https://httpbin.org/post`.
9. Run the job and view attempts.
10. Open **Compare** to see original vs. replayed side-by-side.

---

## Tech stack

| Layer | Tech |
|-------|------|
| API | Cloudflare Workers + Hono |
| Database | Cloudflare D1 (SQLite at edge) |
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack React Query |

---

## Local development

### Prerequisites
- Node.js 18+
- Cloudflare account (free tier works)

### Setup

```bash
# Clone and install
git clone <repo-url>
cd webhook-replay-studio
npm install

# Create D1 database
cd apps/api
npx wrangler d1 create wrs_db
# Copy the database_id into wrangler.toml

# Run migrations
npx wrangler d1 migrations apply wrs_db --local
```

### Run

**Terminal 1 – API:**
```bash
cd apps/api
npm run dev
# http://127.0.0.1:8787
```

**Terminal 2 – Web:**
```bash
cd apps/web
npm run dev
# http://localhost:5173
```

---

## Environment variables

### API (`apps/api/wrangler.toml`)

```toml
[vars]
PUBLIC_API_BASE = "http://127.0.0.1:8787"
APP_ORIGIN = "http://localhost:5173"

[[d1_databases]]
binding = "DB"
database_name = "wrs_db"
database_id = "your-database-id"
```

### Web (`apps/web/.env`)

```
VITE_API_BASE=http://127.0.0.1:8787
```

---

## Deploy to Cloudflare

### API (Workers + D1)

```bash
cd apps/api

# Migrate production database
npx wrangler d1 migrations apply wrs_db --remote

# Deploy
npm run deploy
```

Update `wrangler.toml` vars for production:
```toml
PUBLIC_API_BASE = "https://your-api.workers.dev"
APP_ORIGIN = "https://your-frontend.pages.dev"
```

### Web (Pages)

**Via GitHub:**
1. Connect repo to Cloudflare Pages
2. Build command: `cd apps/web && npm run build`
3. Output directory: `apps/web/dist`
4. Add env var: `VITE_API_BASE=https://your-api.workers.dev`

**Manual:**
```bash
cd apps/web
npm run build
npx wrangler pages deploy dist --project-name=webhook-replay-studio
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS errors | Check `APP_ORIGIN` in `wrangler.toml` matches your frontend URL exactly |
| D1 errors | Run `npx wrangler d1 migrations apply wrs_db --local` |
| API not responding | Check `npx wrangler tail` for logs |

---

## API routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/inboxes` | Create inbox |
| GET | `/api/inboxes` | List inboxes |
| ANY | `/i/:inboxId` | Receive webhooks |
| GET | `/api/inboxes/:inboxId/events` | List events |
| GET | `/api/events/:eventId` | Event details |
| GET | `/api/events/:eventId/safe` | Safe Share |
| POST | `/api/events/:eventId/mutate-preview` | Preview mutations |
| POST | `/api/events/:eventId/replay-jobs` | Create replay job |
| GET | `/api/events/:eventId/replay-jobs` | List replay jobs |
| GET | `/api/replay-jobs/:jobId` | Job with attempts |
| POST | `/api/replay-jobs/:jobId/run` | Run job |
| GET | `/api/replay-jobs/:jobId/compare` | Compare view |

---

## License

MIT
