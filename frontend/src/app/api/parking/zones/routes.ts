import { NextResponse } from 'next/server';
import { getZones } from '@/lib/parking';

export async function GET() {
    try {
        const zones = getZones();
        return NextResponse.json(zones);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}