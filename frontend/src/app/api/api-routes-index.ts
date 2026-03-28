// ═══════════════════════════════════════════════════════════════════════════
// Next.js App Router — API Route Handlers
// Each block below belongs in its own file at the path shown in the comment.
// All routes proxy to the Node.js backend via lib/proxy.ts.
// ═══════════════════════════════════════════════════════════════════════════


// ── FILE: app/api/alerts/route.ts ────────────────────────────────────────────
import { proxyHandler } from '@/lib/proxy';

export const GET  = proxyHandler('/api/alerts');
export const POST = proxyHandler('/api/alerts');


// ── FILE: app/api/alerts/[id]/route.ts ──────────────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const GET   = proxyHandler('/api/alerts/[id]');


// ── FILE: app/api/alerts/[id]/acknowledge/route.ts ───────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/alerts/[id]/acknowledge');


// ── FILE: app/api/alerts/[id]/ignore/route.ts ────────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/alerts/[id]/ignore');


// ── FILE: app/api/alerts/escalate/route.ts ───────────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/alerts/escalate');


// ── FILE: app/api/alerts/[id]/claim/route.ts ─────────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/alerts/[id]/claim');


// ── FILE: app/api/alerts/[id]/release/route.ts ───────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/alerts/[id]/release');


// ── FILE: app/api/incidents/route.ts ─────────────────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const GET  = proxyHandler('/api/incidents');
// export const POST = proxyHandler('/api/incidents');


// ── FILE: app/api/incidents/[id]/route.ts ────────────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const GET   = proxyHandler('/api/incidents/[id]');


// ── FILE: app/api/incidents/[id]/status/route.ts ─────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const PATCH = proxyHandler('/api/incidents/[id]/status');


// ── FILE: app/api/incidents/[id]/confirm/route.ts ────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/incidents/[id]/confirm');


// ── FILE: app/api/incidents/[id]/escalate/route.ts ───────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/incidents/[id]/escalate');


// ── FILE: app/api/incidents/[id]/resolve/route.ts ────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/incidents/[id]/resolve');


// ── FILE: app/api/incidents/[id]/traffic/reroute/route.ts ────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/incidents/[id]/traffic/reroute');


// ── FILE: app/api/incidents/[id]/signals/adjust/route.ts ─────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/incidents/[id]/signals/adjust');


// ── FILE: app/api/incidents/[id]/recommendations/[recId]/approve/route.ts ────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/incidents/[id]/recommendations/[recId]/approve');


// ── FILE: app/api/incidents/[id]/recommendations/[recId]/reject/route.ts ─────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/incidents/[id]/recommendations/[recId]/reject');


// ── FILE: app/api/incidents/[id]/responders/[rspId]/dispatch/route.ts ────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/incidents/[id]/responders/[rspId]/dispatch');


// ── FILE: app/api/incidents/[id]/responders/[rspId]/route/route.ts ───────────
// import { proxyHandler } from '@/lib/proxy';
// export const PATCH = proxyHandler('/api/incidents/[id]/responders/[rspId]/route');


// ── FILE: app/api/corridors/route.ts ─────────────────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const GET = proxyHandler('/api/corridors');


// ── FILE: app/api/corridors/[id]/timing/route.ts ─────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const PATCH = proxyHandler('/api/corridors/[id]/timing');


// ── FILE: app/api/corridors/[id]/lock/route.ts ───────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/corridors/[id]/lock');


// ── FILE: app/api/corridors/[id]/unlock/route.ts ─────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/corridors/[id]/unlock');


// ── FILE: app/api/audit/route.ts ─────────────────────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const GET  = proxyHandler('/api/audit');
// export const POST = proxyHandler('/api/audit');


// ── FILE: app/api/recommendations/route.ts ───────────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const GET = proxyHandler('/api/recommendations');


// ── FILE: app/api/recommendations/[id]/approve/route.ts ──────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/recommendations/[id]/approve');


// ── FILE: app/api/recommendations/[id]/reject/route.ts ───────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const POST = proxyHandler('/api/recommendations/[id]/reject');


// ── FILE: app/api/health/route.ts ────────────────────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const GET = proxyHandler('/api/health');


// ── FILE: app/api/predictive/route.ts ────────────────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const GET = proxyHandler('/api/predictive');


// ── FILE: app/api/predictive/hotspots/route.ts ───────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const GET = proxyHandler('/api/predictive/hotspots');


// ── FILE: app/api/predictive/forecast/route.ts ───────────────────────────────
// import { proxyHandler } from '@/lib/proxy';
// export const GET = proxyHandler('/api/predictive/forecast');