import { NextResponse } from 'next/server';
import { MOCK_CORRIDORS } from '@/lib/mock-data';

// GET /api/corridors
export async function GET() {
    try {
        // ── Replace with real data source ──────────────────
        // const corridors = await db.query('SELECT * FROM corridors');
        // ──────────────────────────────────────────────────

        return NextResponse.json(MOCK_CORRIDORS, {
            headers: {
                'Cache-Control': 'no-store',
                'X-Data-Source': 'mock',
            },
        });
    } catch (err) {
        console.error('[API /corridors]', err);
        return NextResponse.json({ error: 'Failed to fetch corridors' }, { status: 500 });
    }
}

// PATCH /api/corridors  — update signal timing or lock state
export async function PATCH(request: Request) {
    try {
        const body = await request.json() as {
            corridorId: string;
            action: 'update_timing' | 'lock' | 'unlock';
            payload: unknown;
        };

        // ── Replace with real DB write ─────────────────────
        // await db.query('UPDATE corridors SET ... WHERE id = $1', [body.corridorId]);
        // ──────────────────────────────────────────────────

        return NextResponse.json({ success: true, corridorId: body.corridorId });
    } catch (err) {
        console.error('[API PATCH /corridors]', err);
        return NextResponse.json({ error: 'Failed to update corridor' }, { status: 500 });
    }
}