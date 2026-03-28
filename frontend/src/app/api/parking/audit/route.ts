import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/parking';

export async function GET() {
    try {
        const logs = getAuditLogs();
        return NextResponse.json(logs);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}