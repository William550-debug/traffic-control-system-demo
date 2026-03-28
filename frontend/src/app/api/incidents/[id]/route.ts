// app/api/incidents/[...path]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Catch-all proxy for every /api/incidents/* request.
// Delegates entirely to lib/proxy.ts — no fetch logic lives here.
//
// Path mapping:
//   Next.js  /api/incidents/INC-001/confirm
//   Backend  /incidents/INC-001/confirm
// ─────────────────────────────────────────────────────────────────────────────

import { type NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/proxy';

type Context = { params: { path: string[] } };

async function handler(req: NextRequest, { params }: Context): Promise<NextResponse> {
    const subPath = params.path.join('/');
    const { search } = new URL(req.url);
    const backendPath = `/incidents/${subPath}${search}`;

    const res  = await proxyRequest(req, backendPath);
    const body = await res.text();

    return new NextResponse(body, {
        status: res.status,
        headers: {
            'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
            'X-Proxied-By': 'atms-nextjs',
        },
    });
}

export const GET    = handler;
export const POST   = handler;
export const PATCH  = handler;
export const PUT    = handler;
export const DELETE = handler;