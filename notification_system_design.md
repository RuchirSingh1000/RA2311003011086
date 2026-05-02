# Notification System Design

---

## Stage 1

### Core Actions & REST API Contract

#### 1. Fetch Notifications (paginated + filtered)

```
GET /api/v1/notifications
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20, max: 100) |
| `type` | string | Filter by type: `Placement`, `Result`, `Event` |
| `isRead` | boolean | Filter by read status |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
        "type": "Result",
        "message": "mid-sem",
        "isRead": false,
        "createdAt": "2026-04-22T17:51:30Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  },
  "timestamp": "2026-05-02T10:00:00Z"
}
```

---

#### 2. Mark a Notification as Read

```
PATCH /api/v1/notifications/:id/read
```

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "success": true,
  "data": { "id": "d146095a-...", "isRead": true },
  "timestamp": "2026-05-02T10:00:00Z"
}
```

---

#### 3. Mark All Notifications as Read

```
PATCH /api/v1/notifications/read-all
```

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{ "success": true, "data": { "updatedCount": 42 }, "timestamp": "..." }
```

---

#### 4. Unread Count

```
GET /api/v1/notifications/unread-count
```

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{ "success": true, "data": { "unreadCount": 17 }, "timestamp": "..." }
```

---

#### 5. Delete a Notification

```
DELETE /api/v1/notifications/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{ "success": true, "data": { "deleted": true }, "timestamp": "..." }
```

---

### Real-Time Delivery Strategy

**Chosen approach: WebSockets (with SSE as fallback)**

WebSocket is preferred over polling because:
- Full-duplex persistent connection — no redundant HTTP overhead
- Instant push delivery (~millisecond latency vs polling's interval latency)
- Server controls delivery; client simply listens
- Supports bidirectional events (e.g., "mark read" acknowledgement)

**WebSocket endpoint:**
```
WS /ws/notifications
```

**Connection flow:**
1. Client connects with `Authorization: Bearer <token>` in headers (or as query param for browser clients)
2. Server authenticates and registers the connection to that `studentId`
3. When a new notification is created for that student, server pushes:

```json
{
  "event": "new_notification",
  "data": {
    "id": "b283218f-...",
    "type": "Placement",
    "message": "CSX Corporation hiring",
    "createdAt": "2026-04-22T17:51:18Z"
  }
}
```

**SSE fallback** (for clients that cannot use WebSocket):
```
GET /api/v1/notifications/stream
Headers: Accept: text/event-stream
```

---

## Stage 2

### Database Choice: PostgreSQL

**Justification:**
- Notifications are structured, relational data with consistent schemas
- Rich filtering (`type`, `isRead`, `studentId`, date ranges) benefits from SQL's expressive query language
- ACID guarantees prevent duplicate or lost notifications
- Native support for composite indexes critical for this workload
- Partitioning by `studentId` or date range is well-supported

MongoDB is a reasonable alternative for schema flexibility, but the structured nature of this domain makes PostgreSQL the stronger choice.

---

### Schema

```sql
CREATE TYPE notification_type AS ENUM ('Placement', 'Result', 'Event');

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   INTEGER NOT NULL,
  type         notification_type NOT NULL,
  message      TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Indexing

```sql
-- Primary query: unread notifications for a student, newest first
CREATE INDEX idx_notifications_student_read_created
  ON notifications (student_id, is_read, created_at DESC);

-- Unread count per student
CREATE INDEX idx_notifications_student_unread
  ON notifications (student_id)
  WHERE is_read = false;

-- Filtering by type within a student's feed
CREATE INDEX idx_notifications_student_type
  ON notifications (student_id, type, created_at DESC);
```

---

### Scaling Issues & Solutions

As data grows to millions of rows across 50,000+ students:

**Problem 1 — Table bloat**: Full scans become expensive.
**Solution**: Partition by `student_id` range or by `created_at` month (range partitioning).

```sql
CREATE TABLE notifications (...)
PARTITION BY RANGE (created_at);

CREATE TABLE notifications_2026_04
  PARTITION OF notifications
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
```

**Problem 2 — Write bottlenecks**: Bulk inserts (50k+ simultaneous) overwhelm the DB.
**Solution**: Queue-based bulk inserts (see Stage 5).

**Problem 3 — Read amplification**: Every page load queries the DB.
**Solution**: Redis caching for unread counts and recent notifications (see Stage 4).

---

### Sample Queries

```sql
-- Get paginated unread notifications for a student
SELECT id, type, message, is_read, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- Unread count
SELECT COUNT(*) FROM notifications
WHERE student_id = 1042 AND is_read = false;

-- Mark all as read
UPDATE notifications
SET is_read = true, updated_at = NOW()
WHERE student_id = 1042 AND is_read = false;

-- Filter by type
SELECT * FROM notifications
WHERE student_id = 1042 AND type = 'Placement'
ORDER BY created_at DESC
LIMIT 20;
```

---

## Stage 3

### Query Analysis

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

**Why this is slow (at scale):**

1. **No composite index**: Without an index on `(studentID, isRead, createdAt)`, the DB performs a full sequential scan of 5,000,000 rows.
2. **`SELECT *`**: Fetches all columns including `message` (TEXT), causing unnecessary I/O. Should be explicit column selection.
3. **No LIMIT**: Returns every unread notification, which could be thousands of rows, causing both DB and network overhead.
4. **Sort on unindexed column**: `ORDER BY createdAt DESC` requires an in-memory sort if `createdAt` is not part of the index.

**Computation cost without index**: `O(N)` full scan = O(5,000,000) per query.

---

### Indexing Strategy

**Optimal index:**
```sql
CREATE INDEX idx_notifications_student_read_created
  ON notifications (student_id, is_read, created_at DESC);
```

This is a **composite B-tree index** that:
- Filters on `student_id` (high cardinality — narrows to ~100 rows per student)
- Then filters on `is_read = false` (partial filter)
- Then returns rows pre-sorted by `created_at DESC` — **eliminates the sort step entirely**

**Query cost with index**: `O(log N + k)` where k is the number of matching rows (typically small).

---

### Why Indexing Every Column is Inefficient

Indexing every column (as the teammate suggested) is harmful because:

- Each index is a separate B-tree structure that must be updated on every `INSERT`, `UPDATE`, and `DELETE`
- For a write-heavy table (notifications are inserted frequently in bulk), this multiplies write latency proportionally to the number of indexes
- Indexes consume significant disk space — a table with 5M rows and 10 indexes could use 5-10x the storage of the raw table
- The query planner may choose a suboptimal index when many exist, degrading rather than improving performance
- Partial and composite indexes on actual query patterns are far more efficient

---

### Query: Students Who Received Placement Notifications in Last 7 Days

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

**Supporting index:**
```sql
CREATE INDEX idx_notifications_type_created
  ON notifications (type, created_at DESC)
  WHERE type = 'Placement';
```

---

## Stage 4

### Performance Strategy: Caching, Pagination & Real-Time

#### Redis Caching

**What to cache:**
- `unread_count:{studentId}` → integer (TTL: 60s)
- `notifications:{studentId}:page:1` → JSON array (TTL: 30s)

**Cache invalidation strategy:**
- On `PATCH /notifications/:id/read` → delete `unread_count:{studentId}` and page 1 cache
- On new notification inserted → increment `unread_count:{studentId}` in Redis (avoid full DB query)

**Tradeoff**: Slight staleness (up to TTL) vs. eliminating 90%+ of DB reads for the most common operation (badge count on page load).

---

#### Pagination

Use **cursor-based pagination** (keyset) instead of `OFFSET` for large datasets:

```sql
-- Page 1
SELECT * FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at DESC
LIMIT 20;

-- Next page (pass last createdAt from previous response as cursor)
SELECT * FROM notifications
WHERE student_id = 1042 AND is_read = false
  AND created_at < '2026-04-22T17:50:00Z'
ORDER BY created_at DESC
LIMIT 20;
```

`OFFSET`-based pagination degrades to `O(OFFSET)` as pages increase. Keyset pagination is `O(log N)` at every page.

---

#### Polling vs WebSocket

| | Polling | WebSocket |
|---|---|---|
| Latency | Interval-based (1-30s delay) | Near-instant (~1ms) |
| DB load | High (N students × poll frequency) | Low (push on event only) |
| Scalability | Easy but expensive | Requires sticky sessions or pub/sub |
| Implementation | Simple | Moderate complexity |
| Battery (mobile) | Drains faster | Efficient |

**Recommendation**: WebSocket for real-time notifications; use Redis Pub/Sub to fan out across multiple server instances.

---

#### Fan-out Architecture

```
HR triggers "Notify All"
        ↓
Message Queue (Kafka/RabbitMQ)
        ↓
Worker consumes → bulk inserts to DB (batch of 500)
Worker also → publishes to Redis Pub/Sub channel per studentId
        ↓
WebSocket server subscribed to Redis → pushes to connected students
```

This decouples DB writes from real-time delivery and prevents DB overload on mass notifications.

---

#### DB Load Reduction

- Cache unread counts in Redis → eliminates COUNT queries on every page load
- Batch DB writes (bulk insert 500 rows at once vs 50,000 individual inserts)
- Read replicas for `SELECT` queries; primary only for `INSERT`/`UPDATE`
- Table partitioning reduces index scan scope per query

---

## Stage 5

### Analysis of Unreliable Pseudocode

```
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)   # calls Email API
        save_to_db(student_id, message)   # DB insert
        push_to_app(student_id, message)  # real-time push
```

**Shortcomings:**

1. **Synchronous loop**: 50,000 iterations blocks the process. At 100ms per email API call → 83 minutes.
2. **No error isolation**: If `send_email` fails for student 200, the loop halts. Students 201–50,000 never get notified.
3. **No retry mechanism**: Transient email API failures are permanent.
4. **Coupled operations**: Email sending and DB save happen in the same transaction scope. A DB failure after email sends leaves inconsistent state.
5. **No idempotency**: Re-running after failure re-sends emails to students 1–199.
6. **Memory**: Loading 50,000 student IDs into memory simultaneously is risky.

**Should DB save and email happen together?**
No. They should be independent async operations:
- DB save should happen first (source of truth), independently of delivery.
- Email sending is a side effect via a queue — if it fails, retry without re-saving to DB.

---

### Redesigned Architecture

```
notify_all(student_ids, message)
    → publish message to Kafka topic: "notifications.bulk"
    → return 202 Accepted immediately

Kafka Consumer (Notification Worker):
    → consume batch of 500 student_ids
    → bulk INSERT into DB (single query, 500 rows)
    → publish each to topic: "notifications.email" + "notifications.push"
    → mark batch as processed (idempotency key)

Email Worker:
    → consume from "notifications.email"
    → call send_email(student_id, message)
    → on failure: retry up to 3x with exponential back-off
    → on permanent failure: publish to dead-letter queue "notifications.email.dlq"

Push Worker:
    → consume from "notifications.push"
    → publish to Redis Pub/Sub → WebSocket server → client

DLQ Processor (manual/scheduled):
    → inspect failed messages
    → alert ops team or retry manually
```

---

### Improved Pseudocode

```typescript
// Producer (called by HR action)
async function notify_all(student_ids: string[], message: string): Promise<void> {
  const jobId = generateUUID();
  await kafkaProducer.send({
    topic: 'notifications.bulk',
    messages: [{ key: jobId, value: JSON.stringify({ student_ids, message, jobId }) }],
  });
  // Returns immediately — async processing begins
}

// Notification Worker (Kafka consumer)
async function processNotificationBatch(batch: ConsumerMessage): Promise<void> {
  const { student_ids, message, jobId } = JSON.parse(batch.value);

  // Idempotency check
  const alreadyProcessed = await redis.get(`job:${jobId}`);
  if (alreadyProcessed) return;

  // Bulk DB insert (single query)
  const rows = student_ids.map(id => ({ studentId: id, message, type: 'Placement' }));
  await db.bulkInsert('notifications', rows);

  // Fan out to delivery queues
  for (const student_id of student_ids) {
    await kafkaProducer.send({ topic: 'notifications.email', messages: [{ value: JSON.stringify({ student_id, message }) }] });
    await kafkaProducer.send({ topic: 'notifications.push', messages: [{ value: JSON.stringify({ student_id, message }) }] });
  }

  // Mark job as processed
  await redis.set(`job:${jobId}`, '1', 'EX', 86400);
}

// Email Worker (with retry + DLQ)
async function processEmailNotification(msg: ConsumerMessage): Promise<void> {
  const { student_id, message } = JSON.parse(msg.value);
  let attempt = 0;
  while (attempt < 3) {
    try {
      await sendEmail(student_id, message);
      return;
    } catch {
      attempt++;
      await sleep(500 * Math.pow(2, attempt)); // exponential back-off
    }
  }
  // Move to dead-letter queue after 3 failures
  await kafkaProducer.send({ topic: 'notifications.email.dlq', messages: [msg] });
}
```

---

## Stage 6

### Priority Inbox — Approach

**Problem**: Display top N unread notifications ranked by priority type (Placement > Result > Event) combined with recency.

**Data structure**: **Min-Heap of size N**

- Maintains the top N notifications at all times in `O(log N)` per insertion.
- Efficient for streaming: new notifications are compared against the heap's minimum and either discarded or inserted.
- Final extraction is `O(N log N)`.

**Priority Score Formula:**

```
TYPE_WEIGHT = { Placement: 300, Result: 200, Event: 100 }
RECENCY_SCORE = seconds since epoch (normalized)

priority = TYPE_WEIGHT[type] + (timestamp_unix / MAX_TIMESTAMP) * 100
```

This ensures a very recent Event can outrank an old Placement notification, producing a meaningful combined ranking.

**Handling new notifications (streaming)**:
- Maintain a min-heap capped at N items.
- On new notification: compute score. If score > heap.min → pop min, push new.
- This is `O(log N)` per update — constant cost regardless of total notification volume.

See `notification_app_be/priorityInbox.ts` for the working implementation.
