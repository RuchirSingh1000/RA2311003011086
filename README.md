# Backend Portfolio Project

## Repository Structure

```
├── logging_middleware/          # Reusable logging package (Part 1)
├── vehicle_scheduling/          # Vehicle Maintenance Scheduler microservice (Part 2)
│   └── logging_middleware/      # Local copy of logging package (used internally)
├── notification_app_be/         # Priority Inbox implementation (Stage 6)
├── notification_system_design.md # System design — Stages 1–6
└── .gitignore
```

---

## Part 1 — Logging Middleware

Reusable npm-style logging package. Sends structured logs to the evaluation service.

```bash
cd logging_middleware
cp .env.example .env     # set LOG_BEARER_TOKEN
npm install
npm run build
```

Usage:
```typescript
import { Log } from './logging_middleware/src';
await Log('backend', 'info', 'service', 'Message here');
```

---

## Part 2 — Vehicle Maintenance Scheduler

```bash
cd vehicle_scheduling
cp .env.example .env     # set EVALUATION_BEARER_TOKEN + LOG_BEARER_TOKEN
npm install
npm run build
npm start
# or: npx ts-node src/server.ts
```

- API docs: http://localhost:3000/api-docs
- Schedule endpoint: `GET /api/v1/schedule/:depotId`
- Health: `GET /api/v1/health`

---

## Part 3 — Notification System Design

See `notification_system_design.md` — covers Stages 1–6.

---

## Stage 6 — Priority Inbox

```bash
cd notification_app_be
cp ../vehicle_scheduling/.env.example .env   # reuse same token
npm install
npx ts-node priorityInbox.ts
```
