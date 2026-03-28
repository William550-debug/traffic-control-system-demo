'use client';

/**
 * IncidentMap — incident-specific map component
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained wrapper that combines GoogleOperatorMap + MapControls
 * for the incident command view.
 *
 * Design decisions:
 *
 * 1. Coordinates are OPTIONAL — the Incident type from @/types does not
 *    guarantee a coordinates field. This component accepts explicit `lat`/`lng`
 *    props so the caller decides where to source them (API response, geocode
 *    cache, hardcoded seed data, etc.). When absent, it falls back to Nairobi
 *    CBD and shows a "location approximate" badge instead of crashing.
 *
 * 2. The Alert adapter lives here, not in the page. The page passes the raw
 *    Incident; this file is responsible for shaping it for GoogleOperatorMap.
 *
 * 3. Loaded via dynamic() in the page — ssr: false — because vis.gl requires
 *    the browser's window.google object.  This file itself is NOT dynamic;
 *    the dynamic() wrapper is applied at the point of import in the page.
 *
 * 4. Responder HUD badges and CorridorImpactOverlay are rendered here as
 *    absolute overlays on top of the map tiles so the page stays clean.
 *
 * Usage (in incident-page.tsx):
 *
 *   import dynamic from 'next/dynamic';
 *   const IncidentMap = dynamic(
 *     () => import('./incident-map').then(m => ({ default: m.IncidentMap })),
 *     { ssr: false }
 *   );
 *
 *   <IncidentMap
 *     incident={incident}
 *     lat={incident.lat}        // optional — from your API response
 *     lng={incident.lng}        // optional — from your API response
 *     selectedResponderId={...}
 *     onSelectResponder={...}
 *     onSelectIncident={...}
 *   />
 */

import React, { useMemo } from 'react';
import {
    AlertTriangle, ShieldAlert, HeartPulse, Truck, Flame,
    Network, Signal,
} from 'lucide-react';
import { APIProvider, Map, useMap as useGoogleMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useEffect, useRef } from 'react';
import { useMap as useMapState } from '@/hooks/use-map';
import { MapControls } from '@/components/map/map-controls';
import type { Incident, Responder, ResponderStatus } from '@/types';

// ─── Design tokens (mirrors incident-page.tsx) ────────────────────────────────

type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

const SEV: Record<IncidentSeverity, { color: string; bg: string; border: string }> = {
    critical: { color: '#ff3b3b', bg: 'rgba(255,59,59,0.07)',  border: 'rgba(255,59,59,0.28)'  },
    high:     { color: '#ff8800', bg: 'rgba(255,136,0,0.07)',  border: 'rgba(255,136,0,0.26)'  },
    medium:   { color: '#f5c518', bg: 'rgba(245,197,24,0.07)', border: 'rgba(245,197,24,0.26)' },
    low:      { color: '#50c878', bg: 'rgba(80,200,120,0.07)', border: 'rgba(80,200,120,0.22)' },
};

const RICON: Record<Responder['type'], React.ElementType> = {
    police: ShieldAlert, ambulance: HeartPulse, tow: Truck, fire: Flame,
};
const RCOLOR: Record<Responder['type'], string> = {
    police: '#3b9eff', ambulance: '#ff5c5c', tow: '#a78bfa', fire: '#ff8800',
};
const RSTATUS: Record<ResponderStatus, { color: string; label: string }> = {
    en_route:   { color: '#3b9eff', label: 'En Route'   },
    arrived:    { color: '#50c878', label: 'Arrived'    },
    dispatched: { color: '#f5c518', label: 'Dispatched' },
    pending:    { color: '#666',    label: 'Pending'    },
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

// ─── Corridor mock (mirrors CorridorImpact in incident-page.tsx) ──────────────
// In production replace with a prop passed from the incident data layer.

interface CorridorImpact {
    id: string; name: string; density: number;
    deltaVeh: number; rerouted: boolean; signalAdj: boolean;
}

const MOCK_CORRIDORS: CorridorImpact[] = [
    { id: 'C1', name: 'Thika Rd Inbound',  density: 93, deltaVeh: +340, rerouted: true,  signalAdj: true  },
    { id: 'C2', name: 'Thika Rd Outbound', density: 47, deltaVeh: -80,  rerouted: false, signalAdj: true  },
    { id: 'C3', name: 'Muranga Rd bypass', density: 61, deltaVeh: +210, rerouted: true,  signalAdj: false },
    { id: 'C4', name: 'Ngara Rd diversion',density: 72, deltaVeh: +140, rerouted: true,  signalAdj: true  },
    { id: 'C5', name: 'Limuru Rd alt',     density: 38, deltaVeh: +90,  rerouted: false, signalAdj: false },
];

// ─── Fallback coordinates ─────────────────────────────────────────────────────
// Used when the incident arrives without a geospatial position.
// Nairobi CBD — centre of the operator's coverage area.

const NAIROBI_CBD = { lat: -1.2921, lng: 36.8219 } as const;

// ─── Keyframe injection (runs once per browser session) ──────────────────────

let _kfInjected = false;
function ensureKeyframes() {
    if (_kfInjected || typeof document === 'undefined') return;
    _kfInjected = true;
    const s = document.createElement('style');
    s.textContent = `
        @keyframes atms-ring-pulse {
            0%, 100% { opacity: 0.35; transform: scale(1);    }
            50%       { opacity: 0.08; transform: scale(1.35); }
        }`;
    document.head.appendChild(s);
}

// ─── Incident marker overlay (inside <Map> via useGoogleMap) ─────────────────

interface IncidentMarkerProps {
    lat:      number;
    lng:      number;
    severity: IncidentSeverity;
    label:    string;
    onClick:  () => void;
}

function IncidentMarkerLayer({ lat, lng, severity, label, onClick }: IncidentMarkerProps) {
    const map       = useGoogleMap();
    const markerLib = useMapsLibrary('marker');
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const infoRef   = useRef<google.maps.InfoWindow | null>(null);
    const color     = SEV[severity].color;

    useEffect(() => {
        if (!map || !markerLib) return;
        ensureKeyframes();

        const radius = severity === 'critical' ? 11 : severity === 'high' ? 9 : 7;
        const outer  = (radius + 7) * 2;
        const inner  = radius * 2;

        // Outer animated ring
        const ring = document.createElement('div');
        ring.style.cssText = [
            'position:absolute',
            `width:${outer}px`, `height:${outer}px`,
            'border-radius:50%',
            `background:${color}`,
            'opacity:0.15',
            `border:1px solid ${color}`,
            severity === 'critical' ? 'animation:atms-ring-pulse 1.4s ease infinite' : '',
        ].filter(Boolean).join(';');

        // Inner dot
        const dot = document.createElement('div');
        dot.style.cssText = [
            `width:${inner}px`, `height:${inner}px`,
            'border-radius:50%',
            `background:${color}`,
            'opacity:0.95',
            'border:1.5px solid rgba(255,255,255,0.75)',
            'position:relative',
            'cursor:pointer',
        ].join(';');

        // Wrapper
        const el = document.createElement('div');
        el.style.cssText = [
            `width:${outer}px`, `height:${outer}px`,
            'position:relative',
            'display:flex', 'align-items:center', 'justify-content:center',
        ].join(';');
        el.appendChild(ring);
        el.appendChild(dot);

        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
            position:     { lat, lng },
            map,
            content:      el,
            title:        label,
            zIndex:       10,
            gmpClickable: true,
        });

        if (!infoRef.current) {
            infoRef.current = new google.maps.InfoWindow();
        }

        markerRef.current.addEventListener('gmp-click', () => {
            infoRef.current?.setContent(`
                <div style="background:#0c1117;color:#e2e8f0;padding:10px 12px;border-radius:6px;
                     font-family:monospace;font-size:11px;border:1px solid ${color}40;max-width:200px;">
                  <div style="color:${color};font-weight:700;margin-bottom:4px;">
                    ${severity.toUpperCase()}
                  </div>
                  <div style="color:#718096;">📍 ${label}</div>
                </div>
            `);
            infoRef.current?.open({ anchor: markerRef.current!, map });
            onClick();
        });

        return () => {
            if (markerRef.current) { markerRef.current.map = null; markerRef.current = null; }
            infoRef.current?.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, markerLib, lat, lng, severity]);

    return null;
}

// ─── MapState sync layer (inside <Map>) ───────────────────────────────────────
// Responds to pan/zoom changes driven by the operator controls.

interface MapSyncProps {
    center: { lat: number; lng: number };
    zoom:   number;
    onZoomChange:   (z: number) => void;
    onCenterChange: (lat: number, lng: number) => void;
}

function MapSync({ center, zoom, onZoomChange, onCenterChange }: MapSyncProps) {
    const map = useGoogleMap();
    useEffect(() => { if (map) map.panTo(center); }, [map, center.lat, center.lng]);
    useEffect(() => { if (map) map.setZoom(zoom);  }, [map, zoom]);
    return null;
}

// ─── Corridor impact overlay ──────────────────────────────────────────────────

function CorridorOverlay({ corridors, severityColor }: { corridors: CorridorImpact[]; severityColor: string }) {
    return (
        <div style={{
            position:       'absolute',
            bottom:         12,
            left:           12,
            zIndex:         40,
            background:     'rgba(8,11,15,0.88)',
            border:         `1px solid ${severityColor}20`,
            backdropFilter: 'blur(10px)',
            borderRadius:   12,
            padding:        '8px 10px',
            minWidth:       200,
        }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                <Network size={10} strokeWidth={2} style={{ color:'var(--text-disabled)' }} />
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.44rem', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-disabled)' }}>
                    Corridor Impact
                </span>
            </div>
            {corridors.map(c => {
                const dc = c.density >= 80 ? '#ff3b3b' : c.density >= 60 ? '#ff8800' : '#f5c518';
                return (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:2, minWidth:80 }}>
                            {c.rerouted  && <span style={{ width:4, height:4, borderRadius:'50%', background:'#3b9eff', flexShrink:0, display:'inline-block' }} />}
                            {c.signalAdj && <Signal size={7} style={{ color:'#f5c518', flexShrink:0 }} />}
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.42rem', color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:70 }}>
                                {c.name}
                            </span>
                        </div>
                        <div style={{ flex:1, height:3, borderRadius:9999, overflow:'hidden', background:'rgba(255,255,255,0.06)' }}>
                            <div style={{ width:`${c.density}%`, height:'100%', background:dc, borderRadius:9999, transition:'width 0.4s ease' }} />
                        </div>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.42rem', fontWeight:700, color:dc, minWidth:22, textAlign:'right' }}>
                            {c.density}%
                        </span>
                    </div>
                );
            })}
            <div style={{ display:'flex', gap:10, marginTop:6, paddingTop:5, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <span style={{ width:6, height:4, borderRadius:2, background:'#3b9eff', display:'inline-block' }} />
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.38rem', color:'var(--text-disabled)' }}>Rerouted</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <Signal size={7} style={{ color:'#f5c518' }} />
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.38rem', color:'var(--text-disabled)' }}>Signal adj.</span>
                </div>
            </div>
        </div>
    );
}

// ─── Responder HUD badges ─────────────────────────────────────────────────────

interface ResponderHUDProps {
    responders:          Responder[];
    selectedResponderId: string | null;
    onSelectResponder:   (id: string) => void;
}

function ResponderHUD({ responders, selectedResponderId, onSelectResponder }: ResponderHUDProps) {
    const active = responders.filter(r => r.status !== 'pending');
    if (active.length === 0) return null;

    return (
        <div style={{
            position:   'absolute',
            bottom:     58,
            left:       '50%',
            transform:  'translateX(-50%)',
            zIndex:     40,
            display:    'flex',
            gap:        8,
            alignItems: 'center',
        }}>
            {active.map(r => {
                const Icon       = RICON[r.type];
                const c          = RCOLOR[r.type];
                const sMeta      = RSTATUS[r.status];
                const isSelected = r.id === selectedResponderId;
                return (
                    <button
                        key={r.id}
                        onClick={() => onSelectResponder(r.id)}
                        style={{
                            display:        'flex',
                            flexDirection:  'column',
                            alignItems:     'center',
                            gap:            3,
                            padding:        '5px 8px',
                            background:     isSelected ? `${c}1e` : 'rgba(8,11,15,0.88)',
                            border:         `1px solid ${isSelected ? c : `${c}40`}`,
                            borderRadius:   10,
                            cursor:         'pointer',
                            outline:        'none',
                            backdropFilter: 'blur(8px)',
                            transform:      isSelected ? 'translateY(-2px)' : 'none',
                            boxShadow:      isSelected ? `0 4px 14px ${c}28` : 'none',
                            transition:     'all 150ms ease',
                        }}
                    >
                        <Icon size={13} strokeWidth={2} style={{ color: c }} />
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:c, fontWeight:700, whiteSpace:'nowrap' }}>
                            {r.eta !== null ? `${r.eta}m` : '●'}
                        </span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.42rem', color:sMeta.color, whiteSpace:'nowrap' }}>
                            {sMeta.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── Scene status HUD chip ────────────────────────────────────────────────────

function SceneChip({ name, location, severity }: { name: string; location: string; severity: IncidentSeverity }) {
    const s = SEV[severity];
    return (
        <div style={{
            position:       'absolute',
            top:            12,
            left:           '50%',
            transform:      'translateX(-50%)',
            zIndex:         40,
            display:        'flex',
            alignItems:     'center',
            gap:            8,
            padding:        '5px 12px',
            background:     'rgba(8,11,15,0.9)',
            border:         `1px solid ${s.border}`,
            borderRadius:   20,
            backdropFilter: 'blur(10px)',
            pointerEvents:  'none',
        }}>
            <span style={{
                width:7, height:7, borderRadius:'50%',
                background:s.color, flexShrink:0, display:'inline-block',
                animation: severity === 'critical' ? 'pulse-dot 1.2s ease infinite' : 'none',
            }} />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.56rem', fontWeight:700, color:s.color, letterSpacing:'0.06em', whiteSpace:'nowrap' }}>
                {name}
            </span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                {location}
            </span>
        </div>
    );
}

// ─── Approximate location badge ───────────────────────────────────────────────
// Shown when no coordinates were provided and CBD fallback is used.

function ApproximateBadge() {
    return (
        <div style={{
            position:       'absolute',
            top:            44,
            left:           '50%',
            transform:      'translateX(-50%)',
            zIndex:         40,
            padding:        '3px 10px',
            background:     'rgba(245,197,24,0.12)',
            border:         '1px solid rgba(245,197,24,0.35)',
            borderRadius:   12,
            backdropFilter: 'blur(8px)',
            pointerEvents:  'none',
        }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.42rem', color:'#f5c518', letterSpacing:'0.08em' }}>
                ⚠ Location approximate — no GPS data received
            </span>
        </div>
    );
}

// ─── No-API-key fallback ──────────────────────────────────────────────────────

function NoApiKeyState() {
    const GRID  = 'rgba(255,255,255,0.06)';
    const RED   = '#ff3b3b';
    return (
        <div style={{
            width:'100%', height:'100%',
            background:'#080b0f',
            backgroundImage:`linear-gradient(${GRID} 1px,transparent 1px),linear-gradient(90deg,${GRID} 1px,transparent 1px)`,
            backgroundSize:'40px 40px',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:8, position:'relative',
        }}>
            <AlertTriangle size={20} style={{ color: RED }} />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.54rem', color:'var(--text-muted)', textAlign:'center', maxWidth:240, lineHeight:1.5 }}>
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.
                <br />Add it to .env.local to enable the map.
            </span>
        </div>
    );
}

// ─── Inner map content (inside APIProvider + Map) ─────────────────────────────

interface InnerMapProps {
    lat:                 number;
    lng:                 number;
    severity:            IncidentSeverity;
    locationLabel:       string;
    mapCenter:           { lat: number; lng: number };
    mapZoom:             number;
    onZoomChange:        (z: number) => void;
    onCenterChange:      (lat: number, lng: number) => void;
    onSelectIncident:    () => void;
}

function InnerMap({
                      lat, lng, severity, locationLabel,
                      mapCenter, mapZoom, onZoomChange, onCenterChange,
                      onSelectIncident,
                  }: InnerMapProps) {
    return (
        <>
            <MapSync
                center={mapCenter}
                zoom={mapZoom}
                onZoomChange={onZoomChange}
                onCenterChange={onCenterChange}
            />
            <IncidentMarkerLayer
                lat={lat}
                lng={lng}
                severity={severity}
                label={locationLabel}
                onClick={onSelectIncident}
            />
        </>
    );
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface IncidentMapProps {
    incident:            Incident;
    /**
     * Latitude of the incident scene.
     * When omitted the map falls back to Nairobi CBD and shows a warning chip.
     * Source this from your API response, a geocode cache, or a seed fixture:
     *   lat={incident.geo?.lat}  or  lat={incident.coordinates?.lat}
     */
    lat?:                number;
    /** Longitude of the incident scene. */
    lng?:                number;
    selectedResponderId: string | null;
    onSelectResponder:   (id: string) => void;
    onSelectIncident:    () => void;
}

export function IncidentMap({
                                incident,
                                lat,
                                lng,
                                selectedResponderId,
                                onSelectResponder,
                                onSelectIncident,
                            }: IncidentMapProps) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

    // ── Resolve coordinates — never crash on undefined ────────────────────────
    const hasCoords     = typeof lat === 'number' && typeof lng === 'number'
        && isFinite(lat) && isFinite(lng);
    const resolvedLat   = hasCoords ? lat! : NAIROBI_CBD.lat;
    const resolvedLng   = hasCoords ? lng! : NAIROBI_CBD.lng;
    const initialCenter = useMemo(
        () => ({ lat: resolvedLat, lng: resolvedLng }),
        [resolvedLat, resolvedLng],
    );

    // ── Operator map-state hook (pan/zoom/overlays) ───────────────────────────
    const {
        mapState,
        setZoom,
        setViewMode,
        toggleOverlay,
        resetView,
        setCenter,
    } = useMapState();

    const severity = (incident.severity ?? 'high') as IncidentSeverity;
    const sevCfg   = SEV[severity];

    if (!apiKey) return <NoApiKeyState />;

    return (
        <div style={{ position:'relative', width:'100%', height:'100%' }}>

            {/* ── Google Map ── */}
            <APIProvider apiKey={apiKey} libraries={['visualization', 'marker']}>
                <Map
                    style={{ width:'100%', height:'100%' }}
                    defaultCenter={initialCenter}
                    defaultZoom={hasCoords ? 15 : 13}
                    styles={DARK_MAP_STYLE}
                    mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
                    disableDefaultUI
                    gestureHandling="greedy"
                    keyboardShortcuts={false}
                    backgroundColor="#080b0f"
                    onZoomChanged={e => setZoom(e.detail.zoom)}
                    onCenterChanged={e => setCenter(e.detail.center.lat, e.detail.center.lng)}
                >
                    <InnerMap
                        lat={resolvedLat}
                        lng={resolvedLng}
                        severity={severity}
                        locationLabel={incident.location ?? 'Unknown location'}
                        mapCenter={mapState.center}
                        mapZoom={mapState.zoom}
                        onZoomChange={setZoom}
                        onCenterChange={setCenter}
                        onSelectIncident={onSelectIncident}
                    />
                </Map>
            </APIProvider>

            {/* ── Map controls (zoom, overlays, view mode) ── */}
            <MapControls
                mapState={mapState}
                onViewMode={setViewMode}
                onToggleOverlay={toggleOverlay}
                onZoomIn={() => setZoom(Math.min(mapState.zoom + 1, 19))}
                onZoomOut={() => setZoom(Math.max(mapState.zoom - 1, 9))}
                onReset={resetView}
            />

            {/* ── Scene status chip ── */}
            <SceneChip
                name={incident.name ?? incident.id}
                location={incident.location ?? ''}
                severity={severity}
            />

            {/* ── Approximate location warning (shown when no GPS) ── */}
            {!hasCoords && <ApproximateBadge />}

            {/* ── Responder proximity badges ── */}
            <ResponderHUD
                responders={incident.responders ?? []}
                selectedResponderId={selectedResponderId}
                onSelectResponder={onSelectResponder}
            />

            {/* ── Corridor impact overlay ── */}
            <CorridorOverlay corridors={MOCK_CORRIDORS} severityColor={sevCfg.color} />
        </div>
    );
}