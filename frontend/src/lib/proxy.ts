/**
 * Backend proxy utility
 * ──────────────────────
 * All Next.js /api/* route handlers call this to forward requests
 * to the standalone Node.js backend on port 4000.
 *
 * Usage in a route handler:
 *   export const GET  = proxyHandler('GET',  '/api/alerts');
 *   export const POST = proxyHandler('POST', '/api/alerts');
 */

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:4000';
const SECRET  = process.env.API_SECRET  ?? '';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Forward a Next.js Request to the backend and return its Response */
export async function proxyRequest(
    req: Request,
    backendPath: string,
): Promise<Response> {
    const url = `${BACKEND}${backendPath}`;

    const headers = new Headers(req.headers);
    headers.set('Authorization', `Bearer ${SECRET}`);
    // Forward the operator identity if present
    const operatorId = req.headers.get('x-operator-id');
    if (operatorId) headers.set('x-operator-id', operatorId);

    const init: RequestInit = {
        method:  req.method,
        headers,
        // Don't forward body for GET/HEAD
        body:    ['GET','HEAD'].includes(req.method) ? undefined : req.body,
        // @ts-expect-error — Node fetch needs duplex for streamed bodies
        duplex:  'half',
    };

    return fetch(url, init);
}

/**
 * Creates a Next.js route handler that proxies to the backend.
 *
 * @example
 * // app/api/alerts/route.ts
 * export const GET  = proxyHandler('/api/alerts');
 * export const POST = proxyHandler('/api/alerts');
 */
export function proxyHandler(backendPath: string) {
    return async (req: Request, ctx?: { params?: Record<string, string> }): Promise<Response> => {
        // Interpolate dynamic segments: /api/alerts/[id] → /api/alerts/abc123
        let path = backendPath;
        if (ctx?.params) {
            for (const [key, value] of Object.entries(ctx.params)) {
                path = path.replace(`[${key}]`, value);
            }
        }

        // Append query string
        const reqUrl = new URL(req.url);
        if (reqUrl.search) path += reqUrl.search;

        try {
            const response = await proxyRequest(req, path);
            const body     = await response.text();
            return new Response(body, {
                status:  response.status,
                headers: {
                    'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
                    'X-Proxied-By': 'atms-nextjs',
                },
            });
        } catch (err) {
            console.error('[PROXY] Backend unreachable:', err);
            return Response.json({ ok: false, error: 'Backend service unavailable' }, { status: 503 });
        }
    };
}