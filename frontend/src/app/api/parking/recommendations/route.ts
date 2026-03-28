import { NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/parking';

export async function GET() {
    try {
        const recommendations = getRecommendations();
        return NextResponse.json(recommendations);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}