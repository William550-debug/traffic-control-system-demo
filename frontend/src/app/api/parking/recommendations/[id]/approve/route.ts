import { NextRequest, NextResponse } from 'next/server';
import {
    getRecommendationById,
    getZoneById,
    updateZone,
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
            return NextResponse.json(
                { error: `Recommendation already ${rec.status}` },
                { status: 400 }
            );
        }

        const zone = getZoneById(rec.zoneId);
        if (!zone) {
            return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
        }

        const operator = request.headers.get('x-operator') || 'System';
        let finalAction = '';
        let updatedZone = null;

        if (rec.type === 'price_increase' || rec.type === 'price_decrease') {
            const match = rec.action.match(/(\d+)/);
            if (match) {
                const delta = parseInt(match[1], 10);
                let newPrice = zone.currentPrice;
                newPrice += rec.type === 'price_increase' ? delta : -delta;
                newPrice = Math.max(0, newPrice);
                updatedZone = updateZone(zone.id, { currentPrice: newPrice });
                finalAction = `Price changed from KES ${zone.currentPrice} to KES ${newPrice}`;
            } else {
                finalAction = `Approved recommendation: ${rec.action}`;
            }
        } else {
            finalAction = `Approved recommendation: ${rec.action}`;
        }

        updateRecommendationStatus(params.id, 'approved');
        addAuditLog({
            operator,
            time: new Date().toISOString(),
            zone: zone.name,
            aiSuggestion: rec.action,
            finalAction,
            type: 'approved',
        });

        const response: any = { recommendation: { ...rec, status: 'approved' } };
        if (updatedZone) response.zone = updatedZone;
        return NextResponse.json(response);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}