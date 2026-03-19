import { NextResponse } from 'next/server';
import { MOCK_ALERTS } from '@/lib/mock-data';

// GET /api/alerts
export async function GET() {
    try {
        // ── Replace with real data source ──────────────────
        // const alerts = await db.query('SELECT * FROM alerts WHERE status != $1', ['resolved']);
        // ──────────────────────────────────────────────────


        return NextResponse.json(MOCK_ALERTS, {
            headers: { 'Cache-Control': 'no-store', 'X-Data-Source': 'mock' },
        });
    } catch (err) {
        console.error('[API GET /alerts]', err);
        return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }
}

// PATCH /api/alerts — acknowledge / ignore / resolve / dispatch
export async function PATCH(request: Request) {
    try {
        const body = await request.json() as { id: string; action: string };

        // ── Replace with real DB write ─────────────────────
        // await db.query(
        //   'UPDATE alerts SET status = $1, updated_at = NOW() WHERE id = $2',
        //   [mapActionToStatus(body.action), body.id]
        // );
        // ──────────────────────────────────────────────────

        switch (body.action){
            case 'claim':
                // Set alert.claimedBy = body.agency, alert.assignedAgency = body.agency
                break;
            case 'release':
                // Clear alert.claimedBy, alert.assignedAgency
                break;
        }

        return NextResponse.json({ success: true, id: body.id, action: body.action });
    } catch (err) {
        console.error('[API PATCH /alerts]', err);
        return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }
}