import { NextResponse } from 'next/server';
import { MOCK_PREDICTIVE } from '@/lib/mock-data';

// GET /api/predictive
export async function GET() {
    try {
        // ── Replace with real ML model output ──────────────
        // const predictions = await aiModel.getTrafficForecast({ slots: ['now','+30','+60','+120'] });
        // ──────────────────────────────────────────────────

        return NextResponse.json(MOCK_PREDICTIVE, {
            headers: {
                'Cache-Control': 'no-store',
                'X-Data-Source': 'mock',
            },
        });
    } catch (err) {
        console.error('[API /predictive]', err);
        return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 });
    }
}