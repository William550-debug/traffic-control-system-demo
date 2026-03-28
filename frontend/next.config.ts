import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Allow CSS imports from node_modules (required for leaflet/dist/leaflet.css)
    transpilePackages: ['leaflet', 'leaflet.heat'],

    async rewrites() {
        return [
            // Proxy all /api/* requests to the Express backend on :4000
            // This avoids CORS issues and keeps fetch() calls simple ('/api/...')
            {
                source:      '/api/:path*',
                destination: 'http://localhost:4000/api/:path*',
            },
            // Proxy WebSocket upgrade path (/ws) to the same backend
            // Note: Next.js rewrites handle the HTTP upgrade handshake here
            {
                source:      '/ws',
                destination: 'http://localhost:4000/ws',
            },
        ];
    },
};

export default nextConfig;