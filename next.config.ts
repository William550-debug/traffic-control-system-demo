import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    // Allow CSS imports from node_modules (required for leaflet/dist/leaflet.css)
    transpilePackages: ['leaflet', 'leaflet.heat'],
};

export default nextConfig;
