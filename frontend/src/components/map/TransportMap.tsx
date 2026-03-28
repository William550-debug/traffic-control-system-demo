// spellchecker: disable — Nairobi road names: Ngong, Thika, Pangani, Makadara, Langata, Dagoretti
'use client';

/**
 * TransportMap — Network Map tab replacement for TransportControlCenter
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces the hand-drawn SVG `NetworkMap` schematic with real Google Map tiles
 * using actual Nairobi corridor GPS coordinates.
 *
 * Architecture:
 *   - Self-contained: owns APIProvider, Map, all overlays and controls
 *   - No dependency on MapContainer / GoogleOperatorMap — avoids importing the
 *     full operator dashboard map with its alert/heatmap/camera overlays that
 *     don't apply to the transport view
 *   - PSVRouteLayer (inside <Map>): renders polylines + vehicle dots per route
 *   - InfraHotspotLayer: AdvancedMarkerElement circles for Pangani / Dagoretti
 *   - SignalMarkerLayer: cyan squares for active signal corridors
 *   - MapControls from the shared component (zoom / overlays)
 *   - All HTML overlays (phase badge, PSV count, selected route chip, legend)
 *     are absolute-positioned outside <Map>
 *
 * Usage in page.tsx:
 *
 *   import dynamic from 'next/dynamic';
 *   const TransportMap = dynamic(
 *     () => import('./transport-map').then(m => ({ default: m.TransportMap })),
 *     { ssr: false }
 *   );
 *
 *   // In the MAP TAB:
 *   <TransportMap
 *     routes={ROUTES}
 *     selectedRoute={selectedRoute}
 *     onSelectRoute={setSelectedRoute}
 *     systemPhase={SYSTEM_PHASE}
 *     totalPSVs={totalPSVs}
 *   />
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useMap as useMapState } from '@/hooks/use-map';
import { MapControls } from '@/components/map/map-controls';
import { Layers, Bus, Signal } from 'lucide-react';

// ─── Domain types (mirror page.tsx — no shared import needed) ─────────────────
type RouteStatus = 'critical' | 'delayed' | 'normal' | 'optimal';
type SignalMode  = 'ai_managed' | 'manual' | 'fixed' | 'emergency';
type SystemPhase = 1 | 2 | 3;

interface PSVRoute {
    id: string;
    name: string;
    corridor: string;
    origin: string;
    destination: string;
    status: RouteStatus;
    activeVehicles: number;
    totalVehicles: number;
    complianceRate: number;
    deviationCount: number;
    signalMode: SignalMode;
    aiLocked: boolean;
    congestionLevel: number;
    phase: SystemPhase;
}

// ─── Status → color map ───────────────────────────────────────────────────────
const STATUS_COLOR: Record<RouteStatus, string> = {
    critical: '#f87171',   // red-400
    delayed:  '#fbbf24',   // amber-400
    normal:   '#facc15',   // yellow-400
    optimal:  '#34d399',   // emerald-400
};

const PHASE_CFG: Record<SystemPhase, { label: string; color: string; bg: string; border: string; desc: string }> = {
    1: { label: 'Phase 1', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  desc: 'Opt-in Pilot' },
    2: { label: 'Phase 2', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.3)',  desc: 'AI Recommendations Active' },
    3: { label: 'Phase 3', color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.3)',  desc: 'Full Signal Automation' },
};

// ─── Dark map style ───────────────────────────────────────────────────────────
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry',                                         stylers: [{ color: '#080b0f' }] },
    { elementType: 'labels.text.stroke',                               stylers: [{ color: '#080b0f' }] },
    { elementType: 'labels.text.fill',                                 stylers: [{ color: '#4a5568' }] },
    { featureType: 'road',              elementType: 'geometry',       stylers: [{ color: '#131820' }] },
    { featureType: 'road',              elementType: 'geometry.stroke',stylers: [{ color: '#1a2030' }] },
    { featureType: 'road',              elementType: 'labels.text.fill',stylers: [{ color: '#3a4a5a' }] },
    { featureType: 'road.highway',      elementType: 'geometry',       stylers: [{ color: '#1c2535' }] },
    { featureType: 'road.highway',      elementType: 'geometry.stroke',stylers: [{ color: '#243045' }] },
    { featureType: 'road.highway',      elementType: 'labels.text.fill',stylers: [{ color: '#4a6080' }] },
    { featureType: 'water',             elementType: 'geometry',       stylers: [{ color: '#060a10' }] },
    { featureType: 'poi',               elementType: 'geometry',       stylers: [{ color: '#0d1218' }] },
    { featureType: 'poi.park',          elementType: 'geometry',       stylers: [{ color: '#0a1208' }] },
    { featureType: 'transit',           elementType: 'geometry',       stylers: [{ color: '#0f151e' }] },
    { featureType: 'administrative',    elementType: 'geometry',       stylers: [{ color: '#1a2030' }] },
    { featureType: 'landscape',         elementType: 'geometry',       stylers: [{ color: '#0a0e14' }] },
];

// ─── Real Nairobi GPS coordinates for each PSV corridor ──────────────────────
// Sourced from OSM / Google Maps — each array is an ordered set of [lat, lng]
// waypoints that trace the actual road geometry.
/* spellchecker: disable */
const ROUTE_PATHS: Record<string, [number, number][]> = {
    // R-23 — CBD → Thika Town via Thika Superhighway
    'R-23': [
        [-1.2832, 36.8172], [-1.2790, 36.8210], [-1.2750, 36.8270],
        [-1.2700, 36.8320], [-1.2660, 36.8360], [-1.2620, 36.8410],
        [-1.2560, 36.8460], [-1.2490, 36.8520], [-1.2380, 36.8570],
    ],
    // R-07 — CBD → Karen via Ngong Road
    'R-07': [
        [-1.2920, 36.8163], [-1.2940, 36.8100], [-1.2970, 36.8030],
        [-1.3010, 36.7960], [-1.3050, 36.7880], [-1.3100, 36.7820],
        [-1.3170, 36.7760], [-1.3240, 36.7700],
    ],
    // R-44 — CBD → JKIA via Mombasa Road
    'R-44': [
        [-1.2920, 36.8163], [-1.2980, 36.8200], [-1.3050, 36.8260],
        [-1.3120, 36.8330], [-1.3200, 36.8400], [-1.3310, 36.8480],
        [-1.3400, 36.8550], [-1.3520, 36.8630],
    ],
    // R-11 — CBD → Eastlands via Jogoo Road
    'R-11': [
        [-1.2832, 36.8172], [-1.2870, 36.8220], [-1.2900, 36.8270],
        [-1.2930, 36.8320], [-1.2960, 36.8380], [-1.3000, 36.8430],
        [-1.3030, 36.8480],
    ],
    // R-56 — CBD → Westlands via Waiyaki Way
    'R-56': [
        [-1.2832, 36.8172], [-1.2800, 36.8130], [-1.2760, 36.8080],
        [-1.2730, 36.8030], [-1.2700, 36.7980], [-1.2671, 36.7920],
    ],
    // R-31 — CBD → Langata via Uhuru Highway south
    'R-31': [
        [-1.2920, 36.8163], [-1.2980, 36.8163], [-1.3060, 36.8163],
        [-1.3140, 36.8120], [-1.3200, 36.8060], [-1.3270, 36.7990],
        [-1.3340, 36.7930],
    ],
};

// Infrastructure hotspot coordinates (matches infra targets in page.tsx)
const INFRA_HOTSPOTS = [
    { lat: -1.2631, lng: 36.8350, label: 'Pangani ⚠', severity: 'critical' as const },
    { lat: -1.3010, lng: 36.7840, label: 'Dagoretti ⚠', severity: 'high'     as const },
    { lat: -1.2990, lng: 36.8380, label: 'Makadara ⚠', severity: 'high'      as const },
    { lat: -1.3200, lng: 36.8390, label: 'Globe ⚠',    severity: 'medium'    as const },
];

// Signal corridor midpoints (active corridors only)
const SIGNAL_MARKERS = [
    { lat: -1.2631, lng: 36.8390, active: true,  label: 'SC-01 Thika Rd'     },
    { lat: -1.3000, lng: 36.8430, active: false, label: 'SC-02 Jogoo Rd'     },
    { lat: -1.2980, lng: 36.7960, active: false, label: 'SC-03 Ngong Rd'     },
    { lat: -1.3200, lng: 36.8330, active: true,  label: 'SC-04 Mombasa Rd'   },
    { lat: -1.2700, lng: 36.7980, active: true,  label: 'SC-05 Waiyaki Way'  },
];
/* spellchecker: enable */

// Nairobi CBD center — default map view
const CBD = { lat: -1.2832, lng: 36.8172 } as const;

// ─── Keyframe injection (once per session) ────────────────────────────────────
let _kfInjected = false;
function ensureKeyframes() {
    if (_kfInjected || typeof document === 'undefined') return;
    _kfInjected = true;
    const s = document.createElement('style');
    s.textContent = `
        @keyframes psv-pulse {
            0%,100% { opacity:0.9; transform:scale(1);    }
            50%      { opacity:0.4; transform:scale(1.45); }
        }`;
    document.head.appendChild(s);
}

// ─── PSV Route Layer ──────────────────────────────────────────────────────────
// Draws polylines + glow + animated vehicle dots for all routes.

interface PSVRouteLayerProps {
    routes:        PSVRoute[];
    selectedRoute: PSVRoute;
    onSelectRoute: (r: PSVRoute) => void;
}

function PSVRouteLayer({ routes, selectedRoute, onSelectRoute }: PSVRouteLayerProps) {
    const map       = useMap();
    const mapsLib   = useMapsLibrary('maps');
    const markerLib = useMapsLibrary('marker');

    const glowsRef   = useRef<google.maps.Polyline[]>([]);
    const linesRef   = useRef<google.maps.Polyline[]>([]);
    const labelsRef  = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const vehicleRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

    const clearAll = () => {
        glowsRef.current.forEach(p  => p.setMap(null));
        linesRef.current.forEach(p  => p.setMap(null));
        labelsRef.current.forEach(m => { m.map = null; });
        if (vehicleRef.current) { vehicleRef.current.map = null; vehicleRef.current = null; }
        glowsRef.current  = [];
        linesRef.current  = [];
        labelsRef.current = [];
    };

    useEffect(() => {
        if (!map || !mapsLib || !markerLib) return;
        ensureKeyframes();
        clearAll();

        routes.forEach(route => {
            const path = ROUTE_PATHS[route.id];
            if (!path) return;

            const color      = STATUS_COLOR[route.status];
            const isSelected = route.id === selectedRoute.id;
            const isCritical = route.status === 'critical';
            const latLngs    = path.map(([lat, lng]) => ({ lat, lng }));

            // Glow
            glowsRef.current.push(new google.maps.Polyline({
                path:          latLngs,
                strokeColor:   color,
                strokeOpacity: isSelected ? 0.22 : 0.08,
                strokeWeight:  isSelected ? 20   : 12,
                map, zIndex: 1,
                clickable: false,
            }));

            // Main line — dashed for critical routes
            const isDashed = isCritical && !isSelected;
            const mainLine = new google.maps.Polyline({
                path:          latLngs,
                strokeColor:   color,
                strokeOpacity: isSelected ? 1 : 0.55,
                strokeWeight:  isSelected ? 5 : 2.5,
                icons: isDashed ? [{
                    icon:   { path: 'M 0,-1 0,1', strokeOpacity: 0.9, scale: 2.5 },
                    offset: '0',
                    repeat: '12px',
                }] : undefined,
                map, zIndex: 2, clickable: true,
            });

            mainLine.addListener('click', () => onSelectRoute(route));
            linesRef.current.push(mainLine);

            // Compliance-breach dot (low compliance = animated red dot along route)
            if (route.complianceRate < 75) {
                const dotEl = document.createElement('div');
                dotEl.style.cssText = [
                    'width:8px', 'height:8px', 'border-radius:50%',
                    'background:#f87171', 'opacity:0.85',
                    'border:1.5px solid rgba(255,255,255,0.6)',
                    'pointer-events:none',
                ].join(';');
                // Fixed position near start of non-compliant section
                const midIdx = Math.floor(path.length / 2);
                const [mlat, mlng] = path[midIdx];
                labelsRef.current.push(new google.maps.marker.AdvancedMarkerElement({
                    position: { lat: mlat, lng: mlng },
                    map, content: dotEl, zIndex: 5,
                }));
            }

            // Route label at midpoint
            const midIdx = Math.floor(path.length / 2);
            const [mlat, mlng] = path[midIdx];
            const labelEl = document.createElement('div');
            labelEl.style.cssText = [
                'font-family:monospace',
                `font-size:${isSelected ? '11px' : '10px'}`,
                `color:${isSelected ? '#fff' : color}`,
                `font-weight:${isSelected ? '700' : '600'}`,
                'background:rgba(8,11,15,0.72)',
                'padding:1px 5px',
                'border-radius:3px',
                'white-space:nowrap',
                'cursor:pointer',
                'pointer-events:auto',
            ].join(';');
            labelEl.textContent = route.id;

            const labelMarker = new google.maps.marker.AdvancedMarkerElement({
                position: { lat: mlat - 0.004, lng: mlng },
                map, content: labelEl, zIndex: 6, gmpClickable: true,
            });
            labelMarker.addEventListener('gmp-click', () => onSelectRoute(route));
            labelsRef.current.push(labelMarker);
        });

        // Animated vehicle dot on the selected route
        if (selectedRoute && ROUTE_PATHS[selectedRoute.id]) {
            const color    = STATUS_COLOR[selectedRoute.status];
            const vEl      = document.createElement('div');
            vEl.style.cssText = [
                'width:12px', 'height:12px', 'border-radius:50%',
                `background:${color}`,
                'opacity:0.9',
                'border:2px solid rgba(255,255,255,0.8)',
                'pointer-events:none',
                ...(selectedRoute.status === 'critical' ? ['animation:psv-pulse 1.5s ease infinite'] : []),
            ].join(';');

            // Place at start of selected route
            const [slat, slng] = ROUTE_PATHS[selectedRoute.id][0];
            vehicleRef.current = new google.maps.marker.AdvancedMarkerElement({
                position: { lat: slat, lng: slng },
                map, content: vEl, zIndex: 10,
            });
        }

        return clearAll;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, mapsLib, markerLib, routes, selectedRoute]);

    return null;
}

// ─── Infra Hotspot Layer ──────────────────────────────────────────────────────

function InfraHotspotLayer() {
    const map       = useMap();
    const markerLib = useMapsLibrary('marker');
    const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

    useEffect(() => {
        if (!map || !markerLib) return;
        markersRef.current.forEach(m => { m.map = null; });
        markersRef.current = [];

        INFRA_HOTSPOTS.forEach(hs => {
            const c = hs.severity === 'critical' ? '#f87171' : hs.severity === 'high' ? '#fb923c' : '#fbbf24';
            const el = document.createElement('div');
            el.style.cssText = [
                'display:flex', 'align-items:center', 'gap:4px',
                'pointer-events:none',
            ].join(';');

            const dot = document.createElement('div');
            dot.style.cssText = [
                'width:14px', 'height:14px', 'border-radius:50%',
                `background:${c}18`,
                `border:1.5px solid ${c}60`,
                'flex-shrink:0',
            ].join(';');

            const text = document.createElement('span');
            text.style.cssText = [
                'font-family:monospace', 'font-size:9px',
                `color:${c}`,
                'background:rgba(8,11,15,0.7)',
                'padding:1px 3px', 'border-radius:2px',
                'white-space:nowrap',
            ].join(';');
            text.textContent = hs.label;

            el.appendChild(dot);
            el.appendChild(text);

            markersRef.current.push(new google.maps.marker.AdvancedMarkerElement({
                position: { lat: hs.lat, lng: hs.lng },
                map, content: el, zIndex: 4,
                title: hs.label,
            }));
        });

        return () => { markersRef.current.forEach(m => { m.map = null; }); markersRef.current = []; };
    }, [map, markerLib]);

    return null;
}

// ─── Signal Marker Layer ──────────────────────────────────────────────────────

function SignalMarkerLayer() {
    const map       = useMap();
    const markerLib = useMapsLibrary('marker');
    const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

    useEffect(() => {
        if (!map || !markerLib) return;
        markersRef.current.forEach(m => { m.map = null; });
        markersRef.current = [];

        SIGNAL_MARKERS.forEach(sig => {
            const el = document.createElement('div');
            el.style.cssText = [
                'width:10px', 'height:10px', 'border-radius:2px',
                `background:${sig.active ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)'}`,
                `border:1px solid ${sig.active ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.12)'}`,
                'pointer-events:none',
            ].join(';');

            markersRef.current.push(new google.maps.marker.AdvancedMarkerElement({
                position: { lat: sig.lat, lng: sig.lng },
                map, content: el, zIndex: 3,
                title: sig.label,
            }));
        });

        return () => { markersRef.current.forEach(m => { m.map = null; }); markersRef.current = []; };
    }, [map, markerLib]);

    return null;
}

// ─── Map state sync (pan/zoom driven by MapControls) ─────────────────────────

interface MapSyncProps {
    center: { lat: number; lng: number };
    zoom:   number;
}

function MapSync({ center, zoom }: MapSyncProps) {
    const map = useMap();
    useEffect(() => { if (map) map.panTo(center); }, [map, center.lat, center.lng]);
    useEffect(() => { if (map) map.setZoom(zoom);  }, [map, zoom]);
    return null;
}

// ─── No API key fallback ──────────────────────────────────────────────────────

function NoApiKeyState() {
    const GRID = 'rgba(255,255,255,0.06)';
    return (
        <div style={{
            width: '100%', height: '100%', background: '#080b0f',
            backgroundImage: `linear-gradient(${GRID} 1px,transparent 1px),linear-gradient(90deg,${GRID} 1px,transparent 1px)`,
            backgroundSize: '40px 40px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', color: 'var(--text-disabled)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-disabled)', opacity: 0.6 }}>
                Add it to .env.local to enable the map
            </span>
        </div>
    );
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface TransportMapProps {
    routes:        PSVRoute[];
    selectedRoute: PSVRoute;
    onSelectRoute: (r: PSVRoute) => void;
    systemPhase:   SystemPhase;
    totalPSVs:     number;
}

export function TransportMap({
                                 routes,
                                 selectedRoute,
                                 onSelectRoute,
                                 systemPhase,
                                 totalPSVs,
                             }: TransportMapProps) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

    const {
        mapState,
        setZoom,
        setViewMode,
        toggleOverlay,
        resetView,
        setCenter,
    } = useMapState();

    const phase     = PHASE_CFG[systemPhase];
    const routesCfg = {
        critical: '#f87171',
        delayed:  '#fbbf24',
        normal:   '#facc15',
        optimal:  '#34d399',
    };

    if (!apiKey) return <NoApiKeyState />;

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>

            {/* ── Google Map ── */}
            <APIProvider apiKey={apiKey} libraries={['visualization', 'marker']}>
                <Map
                    style={{ width: '100%', height: '100%' }}
                    defaultCenter={CBD}
                    defaultZoom={12}
                    styles={DARK_MAP_STYLE}
                    disableDefaultUI
                    gestureHandling="greedy"
                    keyboardShortcuts={false}
                    mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
                    backgroundColor="#080b0f"
                    onZoomChanged={e => setZoom(e.detail.zoom)}
                    onCenterChanged={e => setCenter(e.detail.center.lat, e.detail.center.lng)}
                >
                    <MapSync center={mapState.center} zoom={mapState.zoom} />
                    <PSVRouteLayer
                        routes={routes}
                        selectedRoute={selectedRoute}
                        onSelectRoute={onSelectRoute}
                    />
                    <InfraHotspotLayer />
                    <SignalMarkerLayer />
                </Map>
            </APIProvider>

            {/* ── MapControls (zoom, view modes, overlays) ── */}
            <MapControls
                mapState={mapState}
                onViewMode={setViewMode}
                onToggleOverlay={toggleOverlay}
                onZoomIn={() => setZoom(Math.min(mapState.zoom + 1, 18))}
                onZoomOut={() => setZoom(Math.max(mapState.zoom - 1, 10))}
                onReset={resetView}
            />

            {/* ── Top-left: phase badge + PSV count ── */}
            <div style={{
                position: 'absolute', top: 12, left: 12, zIndex: 40,
                display: 'flex', flexDirection: 'column', gap: 6,
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 8,
                    background: phase.bg, border: `1px solid ${phase.border}`,
                    backdropFilter: 'blur(10px)',
                }}>
                    <Layers size={11} style={{ color: phase.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', fontWeight: 700, color: phase.color, letterSpacing: '0.06em' }}>
                        {phase.label}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'rgba(255,255,255,0.3)' }}>
                        {phase.desc}
                    </span>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 8,
                    background: 'rgba(8,11,15,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                }}>
                    <Bus size={11} style={{ color: '#22d3ee', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'rgba(255,255,255,0.6)' }}>
                        {totalPSVs} PSVs tracked
                    </span>
                </div>
            </div>

            {/* ── Top-right: selected route chip ── */}
            <div style={{
                position: 'absolute', top: 12, right: 12, zIndex: 40,
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(8,11,15,0.88)',
                border: `1px solid ${STATUS_COLOR[selectedRoute.status]}40`,
                backdropFilter: 'blur(10px)',
            }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                    Viewing
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                    {selectedRoute.id} · {selectedRoute.corridor}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', fontWeight: 700, color: STATUS_COLOR[selectedRoute.status], marginTop: 2 }}>
                    {selectedRoute.status.charAt(0).toUpperCase() + selectedRoute.status.slice(1)} · {selectedRoute.complianceRate}% compliant
                </div>
            </div>

            {/* ── Bottom-left: legend ── */}
            <div style={{
                position: 'absolute', bottom: 12, left: 12, zIndex: 40,
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(8,11,15,0.8)', border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                display: 'flex', flexDirection: 'column', gap: 5,
            }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Network Status
                </span>
                {(Object.entries(routesCfg) as [RouteStatus, string][]).map(([status, color]) => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 16, height: 2.5, borderRadius: 9999, background: color, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color, textTransform: 'capitalize' }}>
                            {status}
                        </span>
                    </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.5)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'rgba(255,255,255,0.35)' }}>Active signal</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(248,113,113,0.18)', border: '1px solid rgba(248,113,113,0.5)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'rgba(255,255,255,0.35)' }}>Infra hotspot</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', border: '1.5px solid rgba(255,255,255,0.6)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'rgba(255,255,255,0.35)' }}>Low compliance</span>
                    </div>
                </div>
            </div>
        </div>
    );
}