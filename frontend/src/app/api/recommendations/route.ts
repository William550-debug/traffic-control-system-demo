import { NextResponse } from 'next/server';
import { MOCK_RECOMMENDATIONS } from '@/lib/mock-data';

// GET /api/recommendations
export async function GET() {
    try {
        // ── Replace with real AI model output ──────────────
        // const recs = await aiEngine.getPendingRecommendations();
        // ──────────────────────────────────────────────────
        return NextResponse.json(MOCK_RECOMMENDATIONS, {
            headers: { 'Cache-Control': 'no-store', 'X-Data-Source': 'mock' },
        });
    } catch (err) {
        console.error('[API GET /recommendations]', err);
        return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
    }
}

// PATCH /api/recommendations — approve / reject / modify
export async function PATCH(request: Request) {
    try {
        const body = await request.json() as {
            id: string;
            action: 'approve' | 'reject' | 'modify';
            reason?: string;
        };

        // ── Replace with real write ────────────────────────
        // await db.query(
        //   'UPDATE recommendations SET status = $1, reviewed_at = NOW() WHERE id = $2',
        //   [body.action, body.id]
        // );
        // ──────────────────────────────────────────────────

        return NextResponse.json({ success: true, id: body.id, action: body.action });
    } catch (err) {
        console.error('[API PATCH /recommendations]', err);
        return NextResponse.json({ error: 'Failed to update recommendation' }, { status: 500 });
    }
}