import { NextResponse } from 'next/server';

// POST /api/alerts/escalate
export async function POST(request: Request) {
    try {
        const body = await request.json() as {
            alertId:     string;
            escalatedBy: string;
            agency:      string;
            reason?:     string;
        };

        if (!body.alertId || !body.escalatedBy) {
            return NextResponse.json(
                { error: 'Missing required fields: alertId, escalatedBy' },
                { status: 400 }
            );
        }

        // ── Replace with real DB write + notification dispatch ──
        // await db.query(
        //   'UPDATE alerts SET status = $1, escalated_by = $2, escalated_at = NOW() WHERE id = $3',
        //   ['escalated', body.escalatedBy, body.alertId]
        // );
        // await notificationService.notifySupervisors({ alertId: body.alertId, reason: body.reason });
        // ────────────────────────────────────────────────────────

        return NextResponse.json({
            success:     true,
            alertId:     body.alertId,
            escalatedAt: new Date().toISOString(),
        }, { status: 201 });
    } catch (err) {
        console.error('[API POST /alerts/escalate]', err);
        return NextResponse.json({ error: 'Failed to escalate alert' }, { status: 500 });
    }
}