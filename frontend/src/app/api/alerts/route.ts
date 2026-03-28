import { proxyHandler } from '@/lib/proxy';

export const GET = proxyHandler('/api/alerts');
export const POST = proxyHandler('/api/alerts');

