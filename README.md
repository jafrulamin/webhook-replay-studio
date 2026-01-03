# Webhook Replay Studio

A powerful webhook testing and replay platform built with Cloudflare Workers and React. Capture, inspect, mutate, and replay webhooks with ease.

## Features

### Webhook Capture
- **Inbox Management**: Create named inboxes to receive webhooks
- **Event Storage**: Automatically capture and store all incoming webhook events
- **Full Request Details**: Store method, path, query parameters, headers, and body content
- **JSON Parsing**: Automatic JSON body parsing for structured data

### Safe Share
- **Data Redaction**: Automatically redact sensitive headers (authorization, cookies, API keys)
- **Body Sanitization**: Remove sensitive fields like tokens, passwords, API keys, emails
- **Sanitized cURL**: Generate safe-to-share cURL commands with redacted data
- **One-Click Copy**: Easy clipboard integration for sharing sanitized requests

### Mutations Preview
- **Header Overrides**: Add, modify, or remove headers before replay
- **JSON Path Overrides**: Modify JSON body values using dot-notation paths
- **Live Preview**: See exactly how your mutations will affect the request
- **Diff Visualization**: Compare original vs. mutated request with detailed diffs

### Webhook Replay
- **Destination Flexibility**: Replay webhooks to any HTTP/HTTPS endpoint
- **Retry Logic**: Configurable retry attempts (1-5) with exponential backoff
- **Attempt History**: Track every replay attempt with full request/response details
- **Status Tracking**: Monitor job status (queued, running, succeeded, failed)
- **Response Snippets**: View response previews (first 400 characters)
- **Compare View**: Side-by-side comparison of original vs. replayed requests

## Tech Stack

### Backend
- **Cloudflare Workers**: Edge computing platform
- **Hono.js**: Fast, lightweight web framework
- **D1 Database**: SQLite-compatible edge database
- **TypeScript**: Type-safe development

### Frontend
- **React 19**: Modern UI framework
- **Vite**: Fast build tool and dev server
- **TypeScript**: Type-safe frontend code

### Infrastructure
- **Monorepo**: Workspace-based project structure
- **D1 Migrations**: Version-controlled database schema

## Prerequisites

- **Node.js** 18+ and npm
- **Cloudflare Account** (for D1 database and Workers deployment)
- **Wrangler CLI** (installed via npm)

## Project Structure

```
webhook-replay-studio/
├── apps/
│   ├── api/                    # Cloudflare Workers API
│   │   ├── migrations/         # D1 database migrations
│   │   │   ├── 0001_init.sql  # Inboxes table
│   │   │   ├── 0002_events.sql # Events table
│   │   │   └── 0004_replay_jobs.sql # Replay jobs tables
│   │   ├── src/
│   │   │   ├── index.ts        # Main API entry point
│   │   │   ├── routes/         # API route handlers
│   │   │   │   ├── inboxes.ts  # Inbox management
│   │   │   │   ├── inboud.ts   # Webhook receiver
│   │   │   │   ├── events.ts   # Event queries
│   │   │   │   └── replayJobs.ts # Replay job API
│   │   │   └── utils/
│   │   │       ├── ids.ts      # ID generation
│   │   │       └── replayRunner.ts # Replay execution
│   │   └── wrangler.toml       # Cloudflare config
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── App.tsx         # Main application
│       │   └── main.tsx        # Entry point
│       └── vite.config.ts      # Vite configuration
└── package.json                # Root workspace config
```

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd webhook-replay-studio
npm install
```

### 2. Configure Cloudflare

Edit `apps/api/wrangler.toml` and update:
- `database_id`: Your D1 database ID
- `APP_ORIGIN`: Your frontend origin (default: `http://localhost:5173`)

### 3. Run Database Migrations

```bash
cd apps/api
npx wrangler d1 migrations apply wrs_db --local
```

For production:
```bash
npx wrangler d1 migrations apply wrs_db --remote
```

### 4. Start Development Servers

**Terminal 1 - API Server:**
```bash
cd apps/api
npm run dev
```
API will be available at `http://127.0.0.1:8787`

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```
Frontend will be available at `http://localhost:5173`

### 5. Create Your First Inbox

1. Open `http://localhost:5173` in your browser
2. Enter a name for your inbox
3. Click "Create Inbox"
4. Copy the webhook URL (e.g., `http://127.0.0.1:8787/i/abc123`)
5. Send a test webhook to that URL

## API Endpoints

### Inboxes

#### `POST /api/inboxes`
Create a new inbox.

**Request:**
```json
{
  "name": "My Inbox"
}
```

**Response:**
```json
{
  "inbox": {
    "id": "inbox_abc123",
    "name": "My Inbox",
    "webhookUrl": "http://127.0.0.1:8787/i/inbox_abc123",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### `GET /api/inboxes`
List all inboxes.

**Response:**
```json
{
  "inboxes": [
    {
      "id": "inbox_abc123",
      "name": "My Inbox",
      "webhookUrl": "http://127.0.0.1:8787/i/inbox_abc123",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Webhook Receiver

#### `ANY /i/:inboxId`
Receive webhooks. Supports all HTTP methods (GET, POST, PUT, PATCH, DELETE, etc.).

The webhook URL format is: `http://your-api-domain/i/{inboxId}`

### Events

#### `GET /api/inboxes/:inboxId/events`
List events for an inbox.

**Response:**
```json
{
  "events": [
    {
      "id": "evt_abc123",
      "receivedAt": "2025-01-01T00:00:00.000Z",
      "method": "POST",
      "path": "/webhook",
      "bodyPreview": "{\"key\":\"value\"}"
    }
  ]
}
```

#### `GET /api/events/:eventId`
Get full event details.

**Response:**
```json
{
  "event": {
    "id": "evt_abc123",
    "inboxId": "inbox_abc123",
    "receivedAt": "2025-01-01T00:00:00.000Z",
    "method": "POST",
    "path": "/webhook",
    "query": {},
    "headers": {
      "content-type": "application/json",
      "authorization": "Bearer token123"
    },
    "contentType": "application/json",
    "body": {
      "isJson": true,
      "json": {"key": "value"},
      "raw": "{\"key\":\"value\"}"
    }
  }
}
```

#### `GET /api/events/:eventId/safe`
Get sanitized event data (redacted sensitive information).

**Response:**
```json
{
  "safe": {
    "eventId": "evt_abc123",
    "inboxId": "inbox_abc123",
    "receivedAt": "2025-01-01T00:00:00.000Z",
    "method": "POST",
    "url": "http://127.0.0.1:8787/i/inbox_abc123",
    "headers": {
      "content-type": "application/json",
      "authorization": "[REDACTED]"
    },
    "body": "{\"key\":\"[REDACTED]\"}",
    "curl": "curl -X POST ..."
  }
}
```

### Mutations Preview

#### `POST /api/events/:eventId/mutate-preview`
Preview how mutations will affect an event.

**Request:**
```json
{
  "headerOverrides": [
    {"action": "set", "name": "x-custom", "value": "test"},
    {"action": "remove", "name": "authorization"}
  ],
  "jsonOverrides": [
    {"path": "user.id", "value": 999},
    {"path": "status", "value": "active"}
  ]
}
```

**Response:**
```json
{
  "preview": {
    "headers": {...},
    "body": {
      "isJson": true,
      "json": {...},
      "raw": "..."
    }
  },
  "diff": {
    "headers": {
      "added": [],
      "removed": ["authorization"],
      "changed": [{"name": "x-custom", "old": null, "new": "test"}]
    },
    "json": {
      "added": [],
      "removed": [],
      "changed": [
        {"path": "user.id", "old": 123, "new": 999},
        {"path": "status", "old": "inactive", "new": "active"}
      ]
    }
  }
}
```

### Replay Jobs

#### `POST /api/events/:eventId/replay-jobs`
Create a replay job.

**Request:**
```json
{
  "destinationUrl": "https://postman-echo.com/post",
  "headerOverrides": [],
  "jsonOverrides": [],
  "retryMax": 3
}
```

**Response:**
```json
{
  "job": {
    "id": "job_abc123",
    "eventId": "evt_abc123",
    "inboxId": "inbox_abc123",
    "destinationUrl": "https://postman-echo.com/post",
    "retryMax": 3,
    "status": "queued",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### `GET /api/events/:eventId/replay-jobs`
List replay jobs for an event.

**Response:**
```json
{
  "jobs": [
    {
      "id": "job_abc123",
      "eventId": "evt_abc123",
      "inboxId": "inbox_abc123",
      "destinationUrl": "https://postman-echo.com/post",
      "retryMax": 3,
      "status": "succeeded",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### `GET /api/replay-jobs/:jobId`
Get replay job details with attempts.

**Response:**
```json
{
  "job": {
    "id": "job_abc123",
    "eventId": "evt_abc123",
    "inboxId": "inbox_abc123",
    "destinationUrl": "https://postman-echo.com/post",
    "headerOverrides": [],
    "jsonOverrides": [],
    "retryMax": 3,
    "status": "succeeded",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:01:00.000Z"
  },
  "attempts": [
    {
      "id": "att_abc123",
      "attemptNo": 1,
      "startedAt": "2025-01-01T00:00:00.000Z",
      "finishedAt": "2025-01-01T00:00:01.000Z",
      "ok": true,
      "responseStatus": 200,
      "responseSnippet": "{\"json\":{...}}",
      "errorMessage": "",
      "requestHeaders": {...},
      "requestBody": "..."
    }
  ]
}
```

#### `GET /api/replay-jobs/:jobId/compare`
Compare original event with last replay attempt.

**Response:**
```json
{
  "ok": true,
  "jobId": "job_abc123",
  "attempt": {
    "id": "att_abc123",
    "attemptNo": 1,
    "responseStatus": 200,
    "success": true
  },
  "original": {
    "method": "POST",
    "path": "/webhook",
    "headers": {...},
    "body": {
      "isJson": true,
      "raw": "..."
    }
  },
  "replay": {
    "headers": {...},
    "body": {
      "isJson": true,
      "raw": "..."
    }
  },
  "diff": {
    "headers": {
      "added": [],
      "removed": [],
      "changed": []
    },
    "json": {
      "added": [],
      "removed": [],
      "changed": [
        {"path": "user.id", "old": 123, "new": 999}
      ]
    }
  }
}
```

## Configuration

### Environment Variables

**API (`apps/api/wrangler.toml`):**
- `PUBLIC_API_BASE`: Public API base URL
- `APP_ORIGIN`: Allowed CORS origin for frontend

**Frontend (`apps/web/.env`):**
- `VITE_API_BASE`: API base URL (default: `http://127.0.0.1:8787`)

## Testing

### Run API Tests

```bash
cd apps/api
npm test
```

### Manual Testing

1. **Create Inbox**: Use the UI or `POST /api/inboxes`
2. **Send Webhook**: Use curl or Postman to send a request to the inbox URL
3. **View Event**: Open the event in the UI
4. **Safe Share**: Click "Safe Share" to see redacted data
5. **Mutations**: Add header/JSON overrides and preview changes
6. **Replay**: Create a replay job and watch attempts execute

## Deployment

### Deploy API to Cloudflare

```bash
cd apps/api

# Apply migrations to production
npx wrangler d1 migrations apply wrs_db --remote

# Deploy worker
npm run deploy
```

### Deploy Frontend

Build and deploy the frontend to any static hosting service:

```bash
cd apps/web
npm run build
# Deploy the 'dist' folder to your hosting service
```

Update `VITE_API_BASE` in your frontend build to point to your deployed API.

## Database Schema

### Inboxes
- `id` (TEXT PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `created_at` (INTEGER NOT NULL)

### Events
- `id` (TEXT PRIMARY KEY)
- `inbox_id` (TEXT NOT NULL)
- `received_at` (INTEGER NOT NULL)
- `method` (TEXT NOT NULL)
- `path` (TEXT NOT NULL)
- `query_json` (TEXT NOT NULL)
- `headers_json` (TEXT NOT NULL)
- `content_type` (TEXT NOT NULL)
- `body_text` (TEXT NOT NULL)
- `body_json` (TEXT)
- `truncated` (INTEGER NOT NULL)

### Replay Jobs
- `id` (TEXT PRIMARY KEY)
- `event_id` (TEXT NOT NULL)
- `destination_url` (TEXT NOT NULL)
- `header_overrides_json` (TEXT NOT NULL)
- `json_overrides_json` (TEXT NOT NULL)
- `max_attempts` (INTEGER NOT NULL)
- `base_delay_ms` (INTEGER NOT NULL)
- `status` (TEXT NOT NULL)
- `created_at` (INTEGER NOT NULL)
- `last_run_at` (INTEGER)

### Replay Attempts
- `id` (TEXT PRIMARY KEY)
- `job_id` (TEXT NOT NULL)
- `attempt_no` (INTEGER NOT NULL)
- `started_at` (INTEGER NOT NULL)
- `finished_at` (INTEGER NOT NULL)
- `request_headers_json` (TEXT NOT NULL)
- `request_body_text` (TEXT NOT NULL)
- `response_status` (INTEGER NOT NULL)
- `response_snippet` (TEXT NOT NULL)
- `error_message` (TEXT NOT NULL)
- `success` (INTEGER NOT NULL)

## Security Features

- **Automatic Redaction**: Sensitive headers and body fields are automatically redacted in Safe Share mode
- **CORS Protection**: Configurable CORS origins
- **Input Validation**: All API endpoints validate input data
- **SQL Injection Protection**: Parameterized queries using D1 prepared statements

## Use Cases

- **Webhook Testing**: Test webhook integrations without exposing production endpoints
- **Debugging**: Inspect webhook payloads and troubleshoot integration issues
- **Development**: Replay webhooks to development/staging environments
- **Documentation**: Generate sanitized cURL commands for documentation
- **A/B Testing**: Test different payload variations before deploying changes

## Contributing

Contributions are welcome! Please ensure:
- Code follows the existing style (no ternary operators, no optional chaining)
- TypeScript types are properly defined
- Database migrations are versioned correctly
- Tests pass before submitting

## License

[Add your license here]

## Acknowledgments

Built with:
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)

---

**Happy Webhook Testing!**
