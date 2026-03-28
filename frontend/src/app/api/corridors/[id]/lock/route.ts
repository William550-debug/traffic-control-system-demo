import { proxyHandler } from '@/lib/proxy';

export const POST = proxyHandler('/api/corridors/[id]/lock');

