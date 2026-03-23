# ATMS Backend — Setup Guide

## Architecture

```
┌─────────────────────────────┐     HTTP/WS     ┌──────────────────────────┐
│  Next.js Frontend           │ ←─────────────→ │  Node.js Backend         │
│  localhost:3000              │                 │  localhost:4000           │
│                             │                 │                          │
│  app/api/*  ────proxy──────►│──── fetch() ───►│  Express routes          │
│  useAlerts()                │                 │  /api/alerts             │
│  useMapIntelligence()       │                 │  /api/incidents          │
│  useRecommendations()       │                 │  /api/corridors          │
│  websocket-provider.tsx     │◄── WS events ───│  /api/audit              │
│                             │   ws://4000/ws  │  /api/recommendations    │
└─────────────────────────────┘                 │  /api/health             │
                                                │  /api/predictive         │
                                                │                          │
                                                │  WebSocket /ws           │
                                                │  (real-time push)        │
                                                └──────────────────────────┘
```

## Backend Setup

```bash
# 1. Navigate into the backend directory (wherever your src/ lives)
cd backend

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env
# Edit .env — set API_SECRET, FRONTEND_URL, PORT as needed

# 4. Run in development (hot-reload)
npm run dev

# 5. Build for production
npm run build
npm start
```

## Frontend Setup

### 1. Add the proxy utility

Copy `proxy.ts` → `src/lib/proxy.ts` in your Next.js project.

### 2. Add environment variables to `.env.local`

```env
BACKEND_URL=http://localhost:4000
API_SECRET=atms-dev-secret-2026
```

### 3. Update existing route handlers

Replace each `app/api/**/route.ts` with the proxy pattern:

```typescript
// app/api/alerts/route.ts
import { proxyHandler } from '@/lib/proxy';
export const GET  = proxyHandler('/api/alerts');
export const POST = proxyHandler('/api/alerts');
```

See `nextjs-api-routes.ts` for the full list of all route files and their proxy calls.

### 4. Update WebSocket provider

In `providers/websocket-provider.tsx`, connect to the backend WS:

```typescript
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000/ws';
const ws = new WebSocket(WS_URL);
```

## API Reference

### Alerts
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/alerts | List all alerts (filter: severity, status, type) |
| GET    | /api/alerts/:id | Get single alert |
| POST   | /api/alerts | Create alert |
| PATCH  | /api/alerts/:id/status | Update status |
| POST   | /api/alerts/:id/acknowledge | Acknowledge |
| POST   | /api/alerts/:id/ignore | Ignore (with reason) |
| POST   | /api/alerts/escalate | Escalate by ID |
| POST   | /api/alerts/:id/claim | Claim (cross-agency lock) |
| POST   | /api/alerts/:id/release | Release claim |

### Incidents
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/incidents | List all |
| GET    | /api/incidents/:id | Get single |
| PATCH  | /api/incidents/:id/status | Update status |
| POST   | /api/incidents/:id/confirm | Confirm incident |
| POST   | /api/incidents/:id/escalate | Escalate |
| POST   | /api/incidents/:id/resolve | Resolve |
| POST   | /api/incidents/:id/traffic/reroute | Trigger AI reroute |
| POST   | /api/incidents/:id/signals/adjust | Adjust signals |
| POST   | /api/incidents/:id/recommendations/:recId/approve | Approve AI rec |
| POST   | /api/incidents/:id/recommendations/:recId/reject | Reject AI rec |
| POST   | /api/incidents/:id/responders/:rspId/dispatch | Dispatch responder |
| PATCH  | /api/incidents/:id/responders/:rspId/route | Reroute responder |

### Corridors
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/corridors | List all |
| GET    | /api/corridors/:id | Get single |
| PATCH  | /api/corridors/:id/timing | Update signal timing |
| POST   | /api/corridors/:id/lock | Lock corridor |
| POST   | /api/corridors/:id/unlock | Unlock corridor |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/audit | Audit log (paginated) |
| POST   | /api/audit | Add audit entry |
| GET    | /api/recommendations | AI recommendations |
| POST   | /api/recommendations/:id/approve | Approve rec |
| POST   | /api/recommendations/:id/reject | Reject rec |
| GET    | /api/health | System health metrics |
| GET    | /api/predictive | All predictive data |
| GET    | /api/predictive/hotspots | Hotspot list |
| GET    | /api/predictive/forecast | 24h congestion forecast |
| GET    | /api/predictive/peak-hours | Peak hours data |

## WebSocket Events

Connect to `ws://localhost:4000/ws`

| Event type | Direction | Payload |
|-----------|-----------|---------|
| `ping` | Server → Client | `{ message, timestamp }` |
| `pong` | Client → Server | `{}` |
| `alert:created` | Server → Client | `Alert` object |
| `alert:updated` | Server → Client | `Alert` object |
| `incident:updated` | Server → Client | `Incident` object |
| `responder:updated` | Server → Client | `{ incidentId, responderId, status, eta, lat?, lng? }` |
| `health:updated` | Server → Client | `{ latencyMs, activeSensors, updatedAt }` |
| `recommendation:new` | Server → Client | `Recommendation` object |

## Authentication

All API requests (except `GET /health`) require:

```
Authorization: Bearer <API_SECRET>
```

For operator-attributed actions, also send:

```
X-Operator-Id: Fatima Nkosi
```

In development, set `API_SECRET=` (empty string) in `.env` to skip auth.

## File Structure

```
src/
├── index.ts              ← Express app + HTTP server + WebSocket init
├── types/
│   └── index.ts          ← All TypeScript types (mirrors frontend types/index.ts)
├── data/
│   └── store.ts          ← In-memory stores + seeded mock data
├── middleware/
│   └── index.ts          ← CORS, auth, rate limiter, audit helper, error handler
├── websocket/
│   └── manager.ts        ← WebSocketServer wrapper + broadcast + dev simulation
└── routes/
    ├── alerts.ts          ← /api/alerts/**
    ├── incidents.ts       ← /api/incidents/**
    └── misc.ts            ← /api/corridors, /api/audit, /api/recommendations,
                              /api/health, /api/predictive
```