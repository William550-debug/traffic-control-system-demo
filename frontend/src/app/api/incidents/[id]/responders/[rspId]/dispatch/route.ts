import { proxyHandler } from '@/lib/proxy';

//this proxy handles both the  [id] and the [rspId] automatically
//

export const POST = proxyHandler('/api/incidents/[id]/responders/[rspId]/dispatch');

