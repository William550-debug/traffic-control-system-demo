import { proxyHandler } from '@/lib/proxy';
/*
* Proxies the confirmation of a new incident.
 * Backend will update status to 'responding' and
 * broadcast 'incident:updated' via WebSocket.
* */

export const POST = proxyHandler('/api/incidents/[id]/confirm');

