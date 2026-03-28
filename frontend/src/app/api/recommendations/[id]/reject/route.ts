import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/recommendations/[id]/reject');

