# Vehicle Maintenance Scheduler

Microservice that computes the **optimal maintenance task allocation** for a given depot using **0/1 Knapsack dynamic programming**.

## Problem

Each depot has limited mechanic hours. Tasks each have a `Duration` (hours) and an `Impact` (importance score). The service selects tasks that **maximise total impact** without exceeding available hours.

## Complexity Analysis

| Metric | Value |
|--------|-------|
| Algorithm | 0/1 Knapsack (Bottom-up DP) |
| Time Complexity | `O(n × W)` — n tasks, W = mechanic hours |
| Space Complexity | `O(n × W)` for DP table |
| Backtracking | `O(n)` to recover selected items |

For real-world depot sizes (n ≈ 100s, W ≈ 200), this is effectively constant-time.

## Setup

```bash
cp .env.example .env
# Fill in EVALUATION_BEARER_TOKEN and LOG_BEARER_TOKEN
npm install
npm run build
npm start
```

Development mode:
```bash
npm run dev
```

## API

### `GET /api/v1/schedule/:depotId`

Returns the optimal maintenance schedule for a depot.

**Parameters:**
- `depotId` (path) — positive integer

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "depotId": 1,
    "mechanicHours": 60,
    "selectedTasks": [
      { "TaskID": "264e638f-...", "Duration": 3, "Impact": 7 }
    ],
    "totalImpact": 120,
    "totalDuration": 58,
    "remainingHours": 2
  },
  "timestamp": "2026-05-02T10:00:00.000Z"
}
```

**Error responses:** `400` (invalid depotId), `404` (depot not found), `500` (internal error)

### `GET /api/v1/health`

Health check endpoint.

### `GET /api-docs`

Swagger UI documentation.

## Architecture

```
src/
├── config/          # App config + Swagger spec
├── clients/         # External API clients (Axios + retry)
├── repositories/    # Data access + caching layer
├── services/        # Business logic
├── controllers/     # HTTP handlers
├── middleware/      # Request logging, error handling
├── validators/      # Input validation
├── utils/           # Knapsack, cache, retry, async wrapper
├── types/           # TypeScript interfaces
├── routes/          # Route definitions
├── app.ts           # Express app setup
└── server.ts        # Entry point
```

## Key Design Decisions

- **PostgreSQL vs MongoDB**: No database needed — tasks fetched from external API and not persisted.
- **Caching**: In-memory TTL cache (swap to Redis for multi-instance).
- **Retry**: Exponential back-off on external API failures.
- **Scheduler**: cron flushes cache every 5 minutes to keep data fresh.
- **No console logging**: All logs go through `Log()` from logging_middleware.
