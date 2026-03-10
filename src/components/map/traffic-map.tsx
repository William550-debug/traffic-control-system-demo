'use client';

import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';
import type { MapState, Alert, Severity, CorridorStatus } from '@/types';
import { SEVERITY_COLORS } from '@/lib/utils';
import { alertMarkerSvg, cameraMarkerSvg, signalMarkerSvg } from './marker-icons';

// ── Static map data ───────────────────────
const INTERSECTIONS = [
    { id: 'int-001', lat: -1.2860, lng: 36.8200, status: 'red'     as const },
    { id: 'int-002', lat: -1.2880, lng: 36.8150, status: 'amber'   as const },
    { id: 'int-003', lat: -1.2910, lng: 36.8230, status: 'green'   as const },
    { id: 'int-004', lat: -1.2990, lng: 36.8163, status: 'amber'   as const },
    { id: 'int-005', lat: -1.3010, lng: 36.8100, status: 'green'   as const },
    { id: 'int-010', lat: -1.2631, lng: 36.8350, status: 'red'     as const },
    { id: 'int-011', lat: -1.2650, lng: 36.8380, status: 'red'     as const },
    { id: 'int-015', lat: -1.3010, lng: 36.7840, status: 'amber'   as const },
    { id: 'int-020', lat: -1.2671, lng: 36.8104, status: 'offline' as const },
];

const CAMERAS = [
    { id: 'cam-001', lat: -1.2870, lng: 36.8210, online: true,  label: 'CBD-01' },
    { id: 'cam-002', lat: -1.2990, lng: 36.8160, online: true,  label: 'UHW-01' },
    { id: 'cam-003', lat: -1.2631, lng: 36.8355, online: true,  label: 'THK-01' },
    { id: 'cam-004', lat: -1.3200, lng: 36.8400, online: false, label: 'MBR-04' },
    { id: 'cam-005', lat: -1.2671, lng: 36.8100, online: true,  label: 'WST-01' },
];

const HEATMAP_POINTS: [number, number, number][] = [
    [-1.2860, 36.8200, 0.95], [-1.2880, 36.8150, 0.90],
    [-1.2910, 36.8230, 0.85], [-1.2921, 36.8219, 0.80],
    [-1.2990, 36.8163, 0.70], [-1.3010, 36.8100, 0.65],
    [-1.2631, 36.8350, 0.98], [-1.2650, 36.8380, 0.92],
    [-1.3010, 36.7840, 0.55], [-1.2671, 36.8104, 0.60],
    [-1.2800, 36.8250, 0.40], [-1.2750, 36.8300, 0.35],
];

// ── Corridor polyline geometry ────────────
interface CorridorLine {
    id:     string;
    name:   string;
    status: CorridorStatus;
    path:   [number, number][];
}

const STATUS_STROKE: Record<CorridorStatus, string> = {
    normal:    '#22c55e',
    congested: '#ff8800',
    blocked:   '#ff3b3b',
    emergency: '#ff3b3b',
    optimized: '#4ecdc4',
};

const CORRIDOR_LINES: CorridorLine[] = [
    {
        id: 'corridor-001', name: 'CBD Ring Road', status: 'blocked',
        path: [[-1.2832,36.8172],[-1.2856,36.8195],[-1.2880,36.8220],[-1.2910,36.8235],[-1.2935,36.8218],[-1.2950,36.8192]],
    },
    {
        id: 'corridor-002', name: 'Uhuru Highway', status: 'congested',
        path: [[-1.2820,36.8163],[-1.2870,36.8163],[-1.2930,36.8163],[-1.2990,36.8163],[-1.3060,36.8163]],
    },
    {
        id: 'corridor-003', name: 'Ngong Road', status: 'congested',
        path: [[-1.2920,36.8050],[-1.2960,36.7970],[-1.3010,36.7900],[-1.3010,36.7840],[-1.3010,36.7770]],
    },
    {
        id: 'corridor-004', name: 'Thika Superhighway', status: 'emergency',
        path: [[-1.2750,36.8290],[-1.2700,36.8320],[-1.2660,36.8350],[-1.2631,36.8370],[-1.2590,36.8410]],
    },
    {
        id: 'corridor-005', name: 'Mombasa Road', status: 'normal',
        path: [[-1.3100,36.8260],[-1.3150,36.8310],[-1.3200,36.8390],[-1.3280,36.8470],[-1.3350,36.8530]],
    },
];

// ── Leaflet.heat type extension ───────────
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace L {
        function heatLayer(
            latlngs: [number, number, number][],
            options?: { radius?: number; blur?: number; maxZoom?: number; gradient?: Record<string, string> }
        ): Leaflet.Layer;
    }
}

// ── Props ─────────────────────────────────
interface TrafficMapProps {
    mapState:            MapState;
    alerts:              Alert[];
    onAlertClick:        (alert: Alert) => void;
    onZoomChange:        (zoom: number) => void;
    onCenterChange:      (lat: number, lng: number) => void;
    onCorridorClick?:    (corridorId: string) => void;
    selectedCorridorId?: string;
}

export function TrafficMap({
                               mapState,
                               alerts,
                               onAlertClick,
                               onZoomChange,
                               onCenterChange,
                               onCorridorClick,
                               selectedCorridorId,
                           }: TrafficMapProps) {
    const containerRef      = useRef<HTMLDivElement>(null);
    const mapRef            = useRef<Leaflet.Map | null>(null);
    const heatLayerRef      = useRef<Leaflet.Layer | null>(null);
    const markersRef        = useRef<Leaflet.Layer[]>([]);
    const corridorLayersRef = useRef<Leaflet.Layer[]>([]);
    const initializedRef    = useRef(false);

    const onAlertClickRef      = useRef(onAlertClick);
    const onZoomChangeRef      = useRef(onZoomChange);
    const onCenterChangeRef    = useRef(onCenterChange);
    const onCorridorClickRef   = useRef(onCorridorClick);
    onAlertClickRef.current    = onAlertClick;
    onZoomChangeRef.current    = onZoomChange;
    onCenterChangeRef.current  = onCenterChange;
    onCorridorClickRef.current = onCorridorClick;

    // ── Init once ────────────────────────────
    useEffect(() => {
        if (initializedRef.current || !containerRef.current) return;
        initializedRef.current = true;

        void (async () => {
            const L = await import('leaflet');
            const iconProto = L.Icon.Default.prototype as unknown as Record<string, unknown>;
            delete iconProto['_getIconUrl'];
            L.Icon.Default.mergeOptions({
                iconUrl:       '/leaflet/marker-icon.png',
                iconRetinaUrl: '/leaflet/marker-icon-2x.png',
                shadowUrl:     '/leaflet/marker-shadow.png',
            });

            const map = L.map(containerRef.current!, {
                center:             [mapState.center.lat, mapState.center.lng],
                zoom:               mapState.zoom,
                zoomControl:        false,
                attributionControl: false,
            });
            mapRef.current = map;

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19, subdomains: 'abcd',
            }).addTo(map);

            L.control.attribution({ prefix: false, position: 'bottomleft' })
                .addTo(map)
                .setPrefix('<span style="font-family:monospace;font-size:9px;opacity:0.3;color:#fff">© CartoDB</span>');

            map.on('zoomend', () => onZoomChangeRef.current(map.getZoom()));
            map.on('moveend', () => {
                const c = map.getCenter();
                onCenterChangeRef.current(c.lat, c.lng);
            });

            await renderLayers(
                L, map, mapState, alerts,
                heatLayerRef, markersRef, corridorLayersRef,
                onAlertClickRef, onCorridorClickRef, selectedCorridorId,
            );
        })();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current      = null;
                initializedRef.current = false;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Pan / zoom ───────────────────────────
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const c   = map.getCenter();
        const d   = Math.abs(c.lat - mapState.center.lat) + Math.abs(c.lng - mapState.center.lng);
        if (d > 0.0001) {
            map.flyTo([mapState.center.lat, mapState.center.lng], mapState.zoom, { duration: 1.2, easeLinearity: 0.3 });
        } else if (map.getZoom() !== mapState.zoom) {
            map.setZoom(mapState.zoom);
        }
    }, [mapState.center, mapState.zoom]);

    // ── Re-render layers ─────────────────────
    useEffect(() => {
        if (!mapRef.current) return;
        void (async () => {
            const L = await import('leaflet');
            await renderLayers(
                L, mapRef.current!, mapState, alerts,
                heatLayerRef, markersRef, corridorLayersRef,
                onAlertClickRef, onCorridorClickRef, selectedCorridorId,
            );
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapState.activeOverlays, mapState.focusedAlertId, alerts, selectedCorridorId]);

    return (
        <>
            <style>{`
        .cmd-tooltip { background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important; }
        .cmd-tooltip::before { display:none!important; }
        .leaflet-container { background:var(--bg-void)!important;font-family:var(--font-mono)!important; }
        .leaflet-tile-pane { filter:brightness(0.85) saturate(0.6); }
        .corridor-line { cursor:pointer; }
        .corridor-line:hover { stroke-width:8!important;stroke-opacity:1!important; }
      `}</style>

            {mapState.viewMode !== 'live' && (
                <div style={{
                    position:'absolute',inset:0,zIndex:400,pointerEvents:'none',
                    background: mapState.viewMode === 'forecast' ? 'rgba(124,106,247,0.06)' : 'rgba(245,197,24,0.04)',
                    borderTop:  `2px dashed ${mapState.viewMode === 'forecast' ? 'rgba(124,106,247,0.3)' : 'rgba(245,197,24,0.3)'}`,
                }} />
            )}
            {mapState.viewMode !== 'live' && (
                <div style={{
                    position:'absolute',top:12,left:12,zIndex:500,padding:'4px 10px',borderRadius:4,
                    background: mapState.viewMode === 'forecast' ? 'rgba(124,106,247,0.15)' : 'rgba(245,197,24,0.12)',
                    border: `1px solid ${mapState.viewMode === 'forecast' ? 'rgba(124,106,247,0.4)' : 'rgba(245,197,24,0.35)'}`,
                }}>
          <span style={{ fontFamily:'var(--font-mono)',fontSize:'0.62rem',letterSpacing:'0.1em',fontWeight:600,
              color: mapState.viewMode === 'forecast' ? 'var(--accent-secondary)' : 'var(--severity-medium)' }}>
            {mapState.viewMode === 'forecast' ? '⟁ FORECAST MODE' : '⏱ HISTORICAL MODE'}
          </span>
                </div>
            )}
            <div ref={containerRef} style={{ width:'100%', height:'100%' }} />
        </>
    );
}

// ── Layer renderer ────────────────────────
async function renderLayers(
    L:                  typeof import('leaflet'),
    map:                Leaflet.Map,
    mapState:           MapState,
    alerts:             Alert[],
    heatLayerRef:       React.MutableRefObject<Leaflet.Layer | null>,
    markersRef:         React.MutableRefObject<Leaflet.Layer[]>,
    corridorLayersRef:  React.MutableRefObject<Leaflet.Layer[]>,
    onAlertClickRef:    React.MutableRefObject<(alert: Alert) => void>,
    onCorridorClickRef: React.MutableRefObject<((corridorId: string) => void) | undefined>,
    selectedCorridorId: string | undefined,
) {
    // Clear
    markersRef.current.forEach(l => map.removeLayer(l));
    markersRef.current = [];
    corridorLayersRef.current.forEach(l => map.removeLayer(l));
    corridorLayersRef.current = [];
    if (heatLayerRef.current) { map.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }

    // ── Heatmap ──────────────────────────
    if (mapState.activeOverlays.includes('heatmap')) {
        try {
            await import('leaflet.heat');
            const gL = window as unknown as { L: typeof L & { heatLayer: (p: [number,number,number][], o: object) => Leaflet.Layer }};
            if (gL.L?.heatLayer) {
                const heat = gL.L.heatLayer(HEATMAP_POINTS, {
                    radius: 35, blur: 25, maxZoom: 17,
                    gradient: { '0.0':'rgba(59,158,255,0)','0.3':'rgba(59,158,255,0.4)','0.5':'rgba(245,197,24,0.6)','0.7':'rgba(255,136,0,0.75)','1.0':'rgba(255,59,59,0.9)' },
                });
                heat.addTo(map);
                heatLayerRef.current = heat;
            }
        } catch { /* skip */ }
    }

    // ── Corridor polylines ────────────────
    const showCorridors = mapState.activeOverlays.includes('incidents')
        || mapState.activeOverlays.includes('heatmap');

    if (showCorridors) {
        CORRIDOR_LINES.forEach(corridor => {
            const isSelected = corridor.id === selectedCorridorId;
            const stroke     = STATUS_STROKE[corridor.status];
            const isDashed   = corridor.status === 'blocked' || corridor.status === 'emergency';

            // Glow/shadow line
            const shadow = L.polyline(corridor.path, {
                color: stroke, weight: isSelected ? 14 : 10,
                opacity: isSelected ? 0.3 : 0.14,
                lineCap: 'round', lineJoin: 'round',
            }).addTo(map);

            // Main line
            const line = L.polyline(corridor.path, {
                color: stroke, weight: isSelected ? 6 : 4,
                opacity: isSelected ? 1 : 0.72,
                lineCap: 'round', lineJoin: 'round',
                dashArray: isDashed ? '8 6' : undefined,
                className: 'corridor-line',
            }).addTo(map);

            // Midpoint name label
            const mid = corridor.path[Math.floor(corridor.path.length / 2)];
            const label = L.marker(mid, {
                icon: L.divIcon({
                    html: `<div style="
            font-family:monospace;font-size:9px;font-weight:600;
            color:${stroke};background:rgba(8,11,15,0.85);
            border:1px solid ${stroke}40;border-radius:3px;
            padding:2px 5px;white-space:nowrap;
            pointer-events:none;transform:translateX(-50%);
          ">${corridor.name}</div>`,
                    className:'', iconSize:[1,1], iconAnchor:[0,0],
                }),
                interactive: false,
            }).addTo(map);

            if (onCorridorClickRef.current) {
                const handler = (e: Leaflet.LeafletMouseEvent) => {
                    L.DomEvent.stopPropagation(e);
                    onCorridorClickRef.current!(corridor.id);
                };
                line.on('click', handler);
                shadow.on('click', handler);
                line.bindTooltip(
                    `<div style="font-family:monospace;font-size:11px;background:rgba(12,17,23,0.95);color:${stroke};border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;line-height:1.5;">
            <strong>${corridor.name}</strong><br/>
            <span style="color:#8a9bb0">${corridor.status.toUpperCase()} · Click to manage</span>
          </div>`,
                    { className:'cmd-tooltip', sticky:true, opacity:1 }
                );
            }

            corridorLayersRef.current.push(shadow, line, label);
        });
    }

    // ── Alert markers ─────────────────────
    if (mapState.activeOverlays.includes('incidents')) {
        alerts.forEach(alert => {
            const focused    = alert.id === mapState.focusedAlertId;
            const iconSize   = focused ? 32 : 24;
            const iconAnchor = focused ? 16 : 12;
            const icon = L.divIcon({
                html: alertMarkerSvg(alert.severity, focused),
                className: '', iconSize: [iconSize,iconSize], iconAnchor: [iconAnchor,iconAnchor],
            });
            const marker = L.marker([alert.location.lat, alert.location.lng], { icon })
                .addTo(map)
                .bindTooltip(
                    `<div style="font-family:monospace;font-size:11px;background:rgba(12,17,23,0.95);color:${SEVERITY_COLORS[alert.severity as Severity]};border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;max-width:200px;line-height:1.5;">
            <strong>${alert.title}</strong><br/>
            <span style="color:#8a9bb0">${alert.location.label}</span>
          </div>`,
                    { className:'cmd-tooltip', sticky:false, opacity:1 }
                );
            marker.on('click', () => onAlertClickRef.current(alert));
            markersRef.current.push(marker);
        });
    }

    // ── Camera markers ────────────────────
    if (mapState.activeOverlays.includes('cameras')) {
        CAMERAS.forEach(cam => {
            const icon = L.divIcon({ html:cameraMarkerSvg(!cam.online), className:'', iconSize:[16,16], iconAnchor:[8,8] });
            const marker = L.marker([cam.lat,cam.lng], { icon }).addTo(map)
                .bindTooltip(
                    `<span style="font-family:monospace;font-size:10px;color:${cam.online?'#4ecdc4':'#6b7280'}">${cam.label} — ${cam.online?'Online':'Offline'}</span>`,
                    { className:'cmd-tooltip', opacity:1 }
                );
            markersRef.current.push(marker);
        });
    }

    // ── Signal markers ────────────────────
    if (mapState.activeOverlays.includes('signals')) {
        INTERSECTIONS.forEach(intersection => {
            const icon = L.divIcon({ html:signalMarkerSvg(intersection.status), className:'', iconSize:[14,20], iconAnchor:[7,20] });
            const marker = L.marker([intersection.lat,intersection.lng], { icon }).addTo(map)
                .bindTooltip(
                    `<span style="font-family:monospace;font-size:10px;color:#e8edf3">Signal ${intersection.id} — ${intersection.status}</span>`,
                    { className:'cmd-tooltip', opacity:1 }
                );
            markersRef.current.push(marker);
        });
    }
}