import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/incidents');
export const POST = proxyHandler('/api/incidents');

