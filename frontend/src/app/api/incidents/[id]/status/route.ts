import { proxyHandler } from '@/lib/proxy';

export const PATCH = proxyHandler('/api/incidents/[id]/status');

