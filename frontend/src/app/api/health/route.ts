import { NextResponse } from 'next/server';
import { MOCK_SYSTEM_HEALTH } from '@/lib/mock-data';

// GET /api/health
export async function GET() {
    try {
        // ── Replace with real data source ──────────────────
        // const health = await fetchIoTNetworkStatus();
        // ──────────────────────────────────────────────────

        const data = {
            ...MOCK_SYSTEM_HEALTH,
            lastRefreshedAt: new Date().toISOString(),
        };

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
                'X-Data-Source': 'mock',
            },
        });
    } catch (err) {
        console.error('[API /health]', err);
        return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 });
    }
}