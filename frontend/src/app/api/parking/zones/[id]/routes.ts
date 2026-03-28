import { NextRequest, NextResponse } from 'next/server';
import {
    getZoneById,
    updateZone,
    getRecommendations,
    updateRecommendationStatus,
    addAuditLog,
} from '@/lib/parking';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const zone = getZoneById(params.id);
        if (!zone) {
            return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
        }
        return NextResponse.json(zone);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const updates = await request.json();
        const operator = request.headers.get('x-operator') || 'System';

        const zone = getZoneById(params.id);
        if (!zone) {
            return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
        }

        // Validation
        if (updates.currentPrice !== undefined && (typeof updates.currentPrice !== 'number' || updates.currentPrice < 0)) {
            return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
        }
        if (updates.locked !== undefined && typeof updates.locked !== 'boolean') {
            return NextResponse.json({ error: 'Invalid locked flag' }, { status: 400 });
        }
        if (updates.aiDisabled !== undefined && typeof updates.aiDisabled !== 'boolean') {
            return NextResponse.json({ error: 'Invalid aiDisabled flag' }, { status: 400 });
        }
        if (updates.occupied !== undefined && (typeof updates.occupied !== 'number' || updates.occupied < 0 || updates.occupied > zone.capacity)) {
            return NextResponse.json({ error: 'Invalid occupancy' }, { status: 400 });
        }

        const oldZone = { ...zone };
        const updatedZone = updateZone(params.id, updates);
        if (!updatedZone) {
            return NextResponse.json({ error: 'Failed to update zone' }, { status: 500 });
        }

        // Determine log action and type
        let logAction = '';
        let logType: 'approved' | 'overridden' | 'rejected' = 'overridden';
        if (updates.currentPrice !== undefined && updates.currentPrice !== oldZone.currentPrice) {
            logAction = `Price changed from KES ${oldZone.currentPrice} to KES ${updatedZone.currentPrice}`;
        } else if (updates.locked !== undefined && updates.locked !== oldZone.locked) {
            logAction = updates.locked ? 'Zone locked' : 'Zone unlocked';
        } else if (updates.aiDisabled !== undefined && updates.aiDisabled !== oldZone.aiDisabled) {
            logAction = updates.aiDisabled ? 'AI disabled' : 'AI enabled';
        } else if (updates.occupied !== undefined) {
            logAction = `Occupancy updated from ${oldZone.occupied} to ${updatedZone.occupied}`;
        } else {
            return NextResponse.json(updatedZone); // no significant change
        }

        // Mark pending recommendations as overridden
        const pendingRecs = getRecommendations().filter(r => r.zoneId === params.id && r.status === 'pending');
        for (const rec of pendingRecs) {
            updateRecommendationStatus(rec.id, 'overridden');
            addAuditLog({
                operator,
                time: new Date().toISOString(),
                zone: updatedZone.name,
                aiSuggestion: rec.action,
                finalAction: `Overridden by manual update: ${logAction}`,
                type: 'overridden',
            });
        }

        // Add audit log for the zone action
        addAuditLog({
            operator,
            time: new Date().toISOString(),
            zone: updatedZone.name,
            aiSuggestion: 'None',
            finalAction: logAction,
            type: logType,
        });

        return NextResponse.json(updatedZone);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}