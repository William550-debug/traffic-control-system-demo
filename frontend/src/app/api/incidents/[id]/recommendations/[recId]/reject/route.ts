import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/incidents/[id]/recommendations/[recId]/reject');

