// ═══════════════════════════════════════════════════════════════════════════
// 1. Add to your frontend .env.local
// ═══════════════════════════════════════════════════════════════════════════

/*
# Backend Node.js server
BACKEND_URL=http://localhost:4000
API_SECRET=atms-dev-secret-2026

# WebSocket (client-side — must start with NEXT_PUBLIC_)
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
*/


// ═══════════════════════════════════════════════════════════════════════════
// 2. next.config.ts — add rewrites so /api/* can also call the backend
//    directly without Next.js route files (useful during development)
// ═══════════════════════════════════════════════════════════════════════════

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Existing config ...

    async rewrites() {
        // In development, proxy /api/* directly to the backend.
        // In production, remove this and use the route handler files instead
        // so Next.js edge/serverless handles auth before forwarding.
        if (process.env.NODE_ENV !== 'development') return [];

        return [
            {
                source:      '/api/:path*',
                destination: `${process.env.BACKEND_URL ?? 'http://localhost:4000'}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;


// ═══════════════════════════════════════════════════════════════════════════
// 3. providers/websocket-provider.tsx — already output as a separate file.
//    Wire it into your root layout:
// ═══════════════════════════════════════════════════════════════════════════

/*
// app/layout.tsx
import { WebSocketProvider } from '@/providers/websocket-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <WebSocketProvider>
                    {children}
                </WebSocketProvider>
            </body>
        </html>
    );
}
*/


// ═══════════════════════════════════════════════════════════════════════════
// 4. File placement summary
// ═══════════════════════════════════════════════════════════════════════════

/*
Frontend changes (copy from outputs/):
────────────────────────────────────────────────────────
  lib/proxy.ts                     ← proxy utility
  providers/websocket-provider.tsx ← replaces existing file
  hooks/use-alertRouter.ts              ← replaces existing file
  hooks/use-system-health.ts       ← replaces existing file
  hooks/use-recommendations.ts     ← replaces existing file
  hooks/use-audit-log.ts           ← replaces existing file
  hooks/use-corridor.ts            ← replaces existing file
  hooks/use-predictive.ts          ← replaces existing file

New API route files — create each at the path shown in api-routes-backend-index.ts:
  app/api/alerts/route.ts
  app/api/alerts/[id]/acknowledge/route.ts
  app/api/alerts/[id]/ignore/route.ts
  app/api/alerts/escalate/route.ts
  app/api/alerts/[id]/claim/route.ts
  app/api/alerts/[id]/release/route.ts
  app/api/incidents/route.ts
  app/api/incidents/[id]/route.ts
  app/api/incidents/[id]/status/route.ts
  app/api/incidents/[id]/confirm/route.ts
  app/api/incidents/[id]/escalate/route.ts
  app/api/incidents/[id]/resolve/route.ts
  app/api/incidents/[id]/traffic/reroute/route.ts
  app/api/incidents/[id]/signals/adjust/route.ts
  app/api/incidents/[id]/recommendations/[recId]/approve/route.ts
  app/api/incidents/[id]/recommendations/[recId]/reject/route.ts
  app/api/incidents/[id]/responders/[rspId]/dispatch/route.ts
  app/api/incidents/[id]/responders/[rspId]/route/route.ts
  app/api/corridors/route.ts
  app/api/corridors/[id]/timing/route.ts
  app/api/corridors/[id]/lock/route.ts
  app/api/corridors/[id]/unlock/route.ts
  app/api/audit/route.ts
  app/api/recommendations/route.ts
  app/api/recommendations/[id]/approve/route.ts
  app/api/recommendations/[id]/reject/route.ts
  app/api/health/route.ts
  app/api/predictive/route.ts
  app/api/predictive/hotspots/route.ts
  app/api/predictive/forecast/route.ts

Backend (new directory alongside your frontend):
  backend/package.json
  backend/tsconfig.json
  backend/.env.example
  backend/README.md
  backend/src/backend-index.ts
  backend/src/types/backend-index.ts
  backend/src/data/store.ts
  backend/src/middleware/backend-index.ts
  backend/src/websocket/manager.ts
  backend/src/routes/alertRouter.ts
  backend/src/routes/incidentRouter.ts
  backend/src/routes/misc.ts
*/