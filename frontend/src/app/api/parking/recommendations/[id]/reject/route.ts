import { NextRequest, NextResponse } from 'next/server';
import {
    getRecommendationById,
    getZoneById,
    updateRecommendationStatus,
    addAuditLog,
} from '@/lib/parking';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const rec = getRecommendationById(params.id);
        if (!rec) {
            return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
        }
        if (rec.status !== 'pending') {
            return NextResponse.json({ error: 'Recommendation already processed' }, { status: 400 });
        }

        const zone = getZoneById(rec.zoneId);
        if (!zone) {
            return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
        }

        const operator = request.headers.get('x-operator') || 'System';
        const finalAction = `Rejected recommendation: ${rec.action}`;

        updateRecommendationStatus(params.id, 'rejected');
        addAuditLog({
            operator,
            time: new Date().toISOString(),
            zone: zone.name,
            aiSuggestion: rec.action,
            finalAction,
            type: 'rejected',
        });

        return NextResponse.json({ recommendation: { ...rec, status: 'rejected' } });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}