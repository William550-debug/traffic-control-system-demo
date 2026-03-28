import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/alerts/[id]/dispatch');

