'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
    APIProvider,
    Map,
    useMap,
    useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { Alert } from '@/types';

// ── Dark control-room map style ───────────
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry',                                  stylers: [{ color: '#080b0f' }] },
    { elementType: 'labels.text.stroke',                        stylers: [{ color: '#080b0f' }] },
    { elementType: 'labels.text.fill',                          stylers: [{ color: '#4a5568' }] },
    { featureType: 'road',           elementType: 'geometry',   stylers: [{ color: '#131820' }] },
    { featureType: 'road',           elementType: 'geometry.stroke', stylers: [{ color: '#1a2030' }] },
    { featureType: 'road',           elementType: 'labels.text.fill', stylers: [{ color: '#3a4a5a' }] },
    { featureType: 'road.highway',   elementType: 'geometry',   stylers: [{ color: '#1c2535' }] },
    { featureType: 'road.highway',   elementType: 'geometry.stroke', stylers: [{ color: '#243045' }] },
    { featureType: 'road.highway',   elementType: 'labels.text.fill', stylers: [{ color: '#4a6080' }] },
    { featureType: 'water',          elementType: 'geometry',   stylers: [{ color: '#060a10' }] },
    { featureType: 'water',          elementType: 'labels.text.fill', stylers: [{ color: '#1a2535' }] },
    { featureType: 'poi',            elementType: 'geometry',   stylers: [{ color: '#0d1218' }] },
    { featureType: 'poi',            elementType: 'labels.text.fill', stylers: [{ color: '#2a3545' }] },
    { featureType: 'poi.park',       elementType: 'geometry',   stylers: [{ color: '#0a1208' }] },
    { featureType: 'transit',        elementType: 'geometry',   stylers: [{ color: '#0f151e' }] },
    { featureType: 'transit.station',elementType: 'labels.text.fill', stylers: [{ color: '#3a5070' }] },
    { featureType: 'administrative', elementType: 'geometry',   stylers: [{ color: '#1a2030' }] },
    { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#3a5070' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#5a7090' }] },
    { featureType: 'landscape',      elementType: 'geometry',   stylers: [{ color: '#0a0e14' }] },
];

// ── Corridor definitions ──────────────────
const CORRIDOR_LINES = [
    {
        id: 'corridor-001', name: 'CBD Ring Road', status: 'blocked' as const,
        path: [[-1.2832,36.8172],[-1.2856,36.8195],[-1.2880,36.8220],[-1.2910,36.8235],[-1.2935,36.8218],[-1.2950,36.8192]],
    },
    {
        id: 'corridor-002', name: 'Uhuru Highway', status: 'congested' as const,
        path: [[-1.2820,36.8163],[-1.2870,36.8163],[-1.2930,36.8163],[-1.2990,36.8163],[-1.3060,36.8163]],
    },
    {
        id: 'corridor-003', name: 'Ngong Road', status: 'congested' as const,
        path: [[-1.2920,36.8050],[-1.2960,36.7970],[-1.3010,36.7900],[-1.3010,36.7840],[-1.3010,36.7770]],
    },
    {
        id: 'corridor-004', name: 'Thika Superhighway', status: 'emergency' as const,
        path: [[-1.2750,36.8290],[-1.2700,36.8320],[-1.2660,36.8350],[-1.2631,36.8370],[-1.2590,36.8410]],
    },
    {
        id: 'corridor-005', name: 'Mombasa Road', status: 'normal' as const,
        path: [[-1.3100,36.8260],[-1.3150,36.8310],[-1.3200,36.8390],[-1.3280,36.8470],[-1.3350,36.8530]],
    },
] as const;

const STATUS_COLOR: Record<string, string> = {
    blocked:   '#ff3b3b',
    emergency: '#ff3b3b',
    congested: '#ff8800',
    slow:      '#f5c518',
    normal:    '#22c55e',
};

// ── Severity colours ──────────────────────
const SEVERITY_COLOR: Record<string, string> = {
    critical: '#ff3b3b',
    high:     '#ff8800',
    medium:   '#f5c518',
    low:      '#3b9eff',
    info:     '#4ecdc4',
};

// ── Inner map with overlays ───────────────
function WallMapOverlays({ alerts }: { alerts: Alert[] }) {
    const map         = useMap();
    const mapsLib     = useMapsLibrary('maps');
    const vizLib      = useMapsLibrary('visualization');

    const polylinesRef  = useRef<google.maps.Polyline[]>([]);
    const markersRef    = useRef<google.maps.Marker[]>([]);
    const heatmapRef    = useRef<google.maps.visualization.HeatmapLayer | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

    // ── Draw corridor polylines ───────────────
    useEffect(() => {
        if (!map || !mapsLib) return;

        // Clear previous
        polylinesRef.current.forEach(p => p.setMap(null));
        polylinesRef.current = [];

        CORRIDOR_LINES.forEach(corridor => {
            const color   = STATUS_COLOR[corridor.status] ?? '#3b9eff';
            const isDashed = corridor.status === 'blocked' || corridor.status === 'emergency';

            // Glow underline
            const glow = new google.maps.Polyline({
                path:          corridor.path.map(([lat, lng]) => ({ lat, lng })),
                strokeColor:   color,
                strokeOpacity: 0.15,
                strokeWeight:  10,
                map,
                zIndex:        1,
            });

            // Main line
            const line = new google.maps.Polyline({
                path:          corridor.path.map(([lat, lng]) => ({ lat, lng })),
                strokeColor:   color,
                strokeOpacity: isDashed ? 0 : 0.9,
                strokeWeight:  3,
                icons:         isDashed ? [{
                    icon:   { path: 'M 0,-1 0,1', strokeOpacity: 0.9, scale: 3 },
                    offset: '0',
                    repeat: '12px',
                }] : undefined,
                map,
                zIndex: 2,
            });

            // Label at midpoint
            const mid      = corridor.path[Math.floor(corridor.path.length / 2)];
            const labelPos = { lat: mid[0] - 0.003, lng: mid[1] };
            const label    = new google.maps.Marker({
                position:  labelPos,
                map,
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
                label: {
                    text:      corridor.name,
                    color:     color,
                    fontSize:  '10px',
                    fontFamily:'monospace',
                    fontWeight:'600',
                },
                zIndex: 3,
            });

            polylinesRef.current.push(glow, line);
            markersRef.current.push(label);
        });

        return () => {
            polylinesRef.current.forEach(p => p.setMap(null));
            polylinesRef.current = [];
        };
    }, [map, mapsLib]);

    // ── Draw alert markers ────────────────────
    useEffect(() => {
        if (!map || !mapsLib) return;

        // Clear only alert markers (keep corridor labels)
        markersRef.current.forEach(m => {
            // Only clear markers that were alert markers (have no label set)
            const lbl = m.getLabel();
            if (!lbl) m.setMap(null);
        });
        markersRef.current = markersRef.current.filter(m => m.getLabel() !== null);

        if (!infoWindowRef.current) {
            infoWindowRef.current = new google.maps.InfoWindow();
        }

        alerts.forEach(alert => {
            const color  = SEVERITY_COLOR[alert.severity] ?? '#3b9eff';
            const radius = alert.severity === 'critical' ? 10 : alert.severity === 'high' ? 8 : 6;

            // Pulse ring (outer)
            const ring = new google.maps.Marker({
                position: { lat: alert.location.lat, lng: alert.location.lng },
                map,
                icon: {
                    path:          google.maps.SymbolPath.CIRCLE,
                    scale:         radius + 6,
                    fillColor:     color,
                    fillOpacity:   0.12,
                    strokeColor:   color,
                    strokeOpacity: 0.4,
                    strokeWeight:  1,
                },
                zIndex: 4,
                optimized: false,
            });

            // Core dot
            const dot = new google.maps.Marker({
                position: { lat: alert.location.lat, lng: alert.location.lng },
                map,
                icon: {
                    path:          google.maps.SymbolPath.CIRCLE,
                    scale:         radius,
                    fillColor:     color,
                    fillOpacity:   0.95,
                    strokeColor:   '#ffffff',
                    strokeOpacity: 0.6,
                    strokeWeight:  1.5,
                },
                title:   alert.title,
                zIndex:  5,
                optimized: false,
            });

            markersRef.current.push(ring, dot);
        });

        return () => {
            markersRef.current.forEach(m => {
                if (!m.getLabel()) m.setMap(null);
            });
        };
    }, [map, mapsLib, alerts]);

    // ── Heatmap layer ─────────────────────────
    useEffect(() => {
        if (!map || !vizLib) return;

        if (heatmapRef.current) {
            heatmapRef.current.setMap(null);
        }

        const heatData = alerts.map(alert => ({
            location: new google.maps.LatLng(alert.location.lat, alert.location.lng),
            weight:   alert.severity === 'critical' ? 4
                : alert.severity === 'high'   ? 3
                    : alert.severity === 'medium' ? 2 : 1,
        }));

        heatmapRef.current = new google.maps.visualization.HeatmapLayer({
            data:   heatData,
            map,
            radius: 50,
            opacity: 0.5,
            gradient: [
                'rgba(0,0,0,0)',
                'rgba(59,158,255,0.3)',
                'rgba(245,197,24,0.5)',
                'rgba(255,136,0,0.7)',
                'rgba(255,59,59,0.9)',
            ],
        });

        return () => {
            heatmapRef.current?.setMap(null);
        };
    }, [map, vizLib, alerts]);

    return null;
}

// ── Public component ──────────────────────
interface GoogleWallMapProps {
    alerts: Alert[];
    apiKey: string;
}

export function GoogleWallMap({ alerts, apiKey }: GoogleWallMapProps) {
    return (
        <APIProvider apiKey={apiKey} libraries={['visualization']}>
            <Map
                style={{ width: '100%', height: '100%' }}
                defaultCenter={{ lat: -1.2921, lng: 36.8219 }}
                defaultZoom={12}
                mapId="wall-map"
                styles={DARK_MAP_STYLE}
                disableDefaultUI
                gestureHandling="none"
                keyboardShortcuts={false}
                backgroundColor="#080b0f"
            >
                <WallMapOverlays alerts={alerts} />
            </Map>
        </APIProvider>
    );
}