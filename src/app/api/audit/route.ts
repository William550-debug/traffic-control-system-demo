import { NextResponse } from 'next/server';
import type { AuditAction } from '@/types';

// In-memory store for development — replace with DB in production
// This resets on server restart, which is fine for dev/demo
const auditLog: AuditAction[] = [];
const MAX_LOG_SIZE = 500;

// GET /api/audit — fetch recent audit entries
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limit  = Math.min(Number(searchParams.get('limit')  ?? 50),  200);
    const agency = searchParams.get('agency');

    try {
        let entries = [...auditLog].reverse(); // newest first
        if (agency) entries = entries.filter(e => e.agency === agency);

        return NextResponse.json(entries.slice(0, limit), {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (err) {
        console.error('[API GET /audit]', err);
        return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
    }
}

// POST /api/audit — append a new audit action
export async function POST(request: Request) {
    try {
        const body = await request.json() as Omit<AuditAction, 'id' | 'timestamp'> & {
            id?:        string;
            timestamp?: string;
        };

        const entry: AuditAction = {
            ...body,
            id:        body.id        ?? `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        };

        // Validate required fields
        if (!entry.type || !entry.performedBy || !entry.agency) {
            return NextResponse.json(
                { error: 'Missing required fields: type, performedBy, agency' },
                { status: 400 }
            );
        }

        auditLog.push(entry);
        if (auditLog.length > MAX_LOG_SIZE) auditLog.splice(0, auditLog.length - MAX_LOG_SIZE);

        // ── Replace with real DB write ─────────────────────
        // await db.query(
        //   'INSERT INTO audit_log (id, type, performed_by, agency, target_id, target_label, details, timestamp) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        //   [entry.id, entry.type, entry.performedBy, entry.agency, entry.targetId, entry.targetLabel, entry.details, entry.timestamp]
        // );
        // ──────────────────────────────────────────────────

        return NextResponse.json({ success: true, id: entry.id }, { status: 201 });
    } catch (err) {
        console.error('[API POST /audit]', err);
        return NextResponse.json({ error: 'Failed to write audit entry' }, { status: 500 });
    }
}