import { type NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '@/lib/proxy';

type Context = { params: { path: string[] } };

export async function handler(req: NextRequest, { params }: Context): Promise<NextResponse> {
    const subPath = params.path.join('/');
    const { search } = new URL(req.url);
    // Maps frontend /api/alerts/... to backend /alerts/...
    const backendPath = `/alerts/${subPath}${search}`;

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

export const GET = handler; export const POST = handler; export const PATCH = handler;