'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
    APIProvider,
    Map,
    useMap,
    useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { Alert, MapState, CorridorStatus } from '@/types';
import { MOCK_PREDICTIVE, MOCK_HISTORICAL } from '@/lib/mock-data';

// ── Dark map style ────────────────────────
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry',                                        stylers: [{ color: '#080b0f' }] },
    { elementType: 'labels.text.stroke',                              stylers: [{ color: '#080b0f' }] },
    { elementType: 'labels.text.fill',                                stylers: [{ color: '#4a5568' }] },
    { featureType: 'road',             elementType: 'geometry',       stylers: [{ color: '#131820' }] },
    { featureType: 'road',             elementType: 'geometry.stroke',stylers: [{ color: '#1a2030' }] },
    { featureType: 'road',             elementType: 'labels.text.fill',stylers: [{ color: '#3a4a5a' }] },
    { featureType: 'road.highway',     elementType: 'geometry',       stylers: [{ color: '#1c2535' }] },
    { featureType: 'road.highway',     elementType: 'geometry.stroke',stylers: [{ color: '#243045' }] },
    { featureType: 'road.highway',     elementType: 'labels.text.fill',stylers: [{ color: '#4a6080' }] },
    { featureType: 'road.arterial',    elementType: 'labels.text.fill',stylers: [{ color: '#3a5070' }] },
    { featureType: 'water',            elementType: 'geometry',       stylers: [{ color: '#060a10' }] },
    { featureType: 'poi',              elementType: 'geometry',       stylers: [{ color: '#0d1218' }] },
    { featureType: 'poi',              elementType: 'labels.text.fill',stylers: [{ color: '#2a3545' }] },
    { featureType: 'poi.park',         elementType: 'geometry',       stylers: [{ color: '#0a1208' }] },
    { featureType: 'transit',          elementType: 'geometry',       stylers: [{ color: '#0f151e' }] },
    { featureType: 'transit.station',  elementType: 'labels.text.fill',stylers: [{ color: '#3a5070' }] },
    { featureType: 'administrative',   elementType: 'geometry',       stylers: [{ color: '#1a2030' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#5a7090' }] },
    { featureType: 'landscape',        elementType: 'geometry',       stylers: [{ color: '#0a0e14' }] },
];

// ── Static overlay data ───────────────────
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

const CORRIDOR_LINES = [
    { id: 'corridor-001', name: 'CBD Ring Road',      status: 'blocked'   as CorridorStatus, path: [[-1.2832,36.8172],[-1.2856,36.8195],[-1.2880,36.8220],[-1.2910,36.8235],[-1.2935,36.8218],[-1.2950,36.8192]] },
    { id: 'corridor-002', name: 'Uhuru Highway',      status: 'congested' as CorridorStatus, path: [[-1.2820,36.8163],[-1.2870,36.8163],[-1.2930,36.8163],[-1.2990,36.8163],[-1.3060,36.8163]] },
    { id: 'corridor-003', name: 'Ngong Road',         status: 'congested' as CorridorStatus, path: [[-1.2920,36.8050],[-1.2960,36.7970],[-1.3010,36.7900],[-1.3010,36.7840],[-1.3010,36.7770]] },
    { id: 'corridor-004', name: 'Thika Superhighway', status: 'emergency' as CorridorStatus, path: [[-1.2750,36.8290],[-1.2700,36.8320],[-1.2660,36.8350],[-1.2631,36.8370],[-1.2590,36.8410]] },
    { id: 'corridor-005', name: 'Mombasa Road',       status: 'normal'    as CorridorStatus, path: [[-1.3100,36.8260],[-1.3150,36.8310],[-1.3200,36.8390],[-1.3280,36.8470],[-1.3350,36.8530]] },
] as const;

// ── Colour maps ───────────────────────────
const STATUS_COLOR: Record<string, string> = {
    blocked:   '#ff3b3b',
    emergency: '#ff3b3b',
    congested: '#ff8800',
    slow:      '#f5c518',
    normal:    '#22c55e',
    optimized: '#4ecdc4',
};

const SEVERITY_COLOR: Record<string, string> = {
    critical: '#ff3b3b',
    high:     '#ff8800',
    medium:   '#f5c518',
    low:      '#3b9eff',
    info:     '#4ecdc4',
};

const SIGNAL_COLOR: Record<string, string> = {
    red:     '#ff3b3b',
    amber:   '#f5c518',
    green:   '#22c55e',
    offline: '#6b7280',
};

// ── Forecast slot labels ──────────────────
const FORECAST_LABELS = ['Now', '+30 min', '+60 min', '+120 min'];

// ── Historical scrubber labels ────────────
const HISTORICAL_LABELS = MOCK_HISTORICAL.map(h => h.label);

// ── Helper: corridor color for forecast mode ──
function getForecastColor(corridorId: string, slotIndex: number): string {
    const snapshot = MOCK_PREDICTIVE[slotIndex];
    if (!snapshot) return '#3b3f4a';
    const hotspot = snapshot.hotspots.find(h => h.corridorId === corridorId);
    if (!hotspot) return '#22c55e40'; // no hotspot = faint green
    return SEVERITY_COLOR[hotspot.severity] ?? '#3b9eff';
}

// ── Helper: corridor color for historical mode ──
function getHistoricalColor(corridorId: string, hourIndex: number): string {
    const snapshot = MOCK_HISTORICAL[hourIndex];
    if (!snapshot) return '#3b3f4a';
    const corridor = snapshot.corridors.find(c => c.corridorId === corridorId);
    if (!corridor) return '#3b3f4a';
    return STATUS_COLOR[corridor.status] ?? '#3b3f4a';
}

// ── Mode banner overlay (HTML over map) ──
interface ModeBannerProps {
    viewMode:             MapState['viewMode'];
    forecastSlot:         number;
    historicalHour:       number;
    onForecastSlotChange: (i: number) => void;
    onHistoricalHourChange: (i: number) => void;
}

function ModeBanner({
                        viewMode,
                        forecastSlot,
                        historicalHour,
                        onForecastSlotChange,
                        onHistoricalHourChange,
                    }: ModeBannerProps) {
    if (viewMode === 'live') return null;

    const isForecast   = viewMode === 'forecast';
    const isHistorical = viewMode === 'historical';
    const accentColor  = isForecast ? '#7c6af7' : '#f5c518';
    const labels       = isForecast ? FORECAST_LABELS : HISTORICAL_LABELS;
    const activeIndex  = isForecast ? forecastSlot : historicalHour;
    const onChange     = isForecast ? onForecastSlotChange : onHistoricalHourChange;

    const snapshot = isHistorical ? MOCK_HISTORICAL[historicalHour] : null;

    return (
        <div style={{
            position:       'absolute',
            bottom:         16,
            left:           '50%',
            transform:      'translateX(-50%)',
            zIndex:         500,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            gap:            8,
            pointerEvents:  'auto',
        }}>
            {/* Mode label */}
            <div style={{
                padding:        '3px 12px',
                background:     `${accentColor}20`,
                border:         `1px solid ${accentColor}50`,
                borderRadius:   20,
                fontFamily:     'var(--font-mono)',
                fontSize:       '0.55rem',
                letterSpacing:  '0.14em',
                textTransform:  'uppercase',
                color:          accentColor,
            }}>
                {isForecast ? '▶ Forecast Mode' : '◀ Historical Mode'}
            </div>

            {/* Slot / hour selector */}
            <div style={{
                display:        'flex',
                gap:            4,
                padding:        '6px 8px',
                background:     'rgba(8,11,15,0.88)',
                border:         '1px solid rgba(255,255,255,0.1)',
                borderRadius:   10,
                backdropFilter: 'blur(12px)',
            }}>
                {labels.map((label, i) => (
                    <button
                        key={i}
                        onClick={() => onChange(i)}
                        style={{
                            padding:       '5px 12px',
                            background:    i === activeIndex ? accentColor : 'transparent',
                            border:        `1px solid ${i === activeIndex ? accentColor : 'rgba(255,255,255,0.1)'}`,
                            borderRadius:  6,
                            cursor:        'pointer',
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '0.6rem',
                            fontWeight:    i === activeIndex ? 700 : 400,
                            color:         i === activeIndex ? '#000' : 'var(--text-muted)',
                            transition:    'all 150ms ease',
                            outline:       'none',
                            letterSpacing: '0.05em',
                            whiteSpace:    'nowrap',
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Historical stats panel */}
            {isHistorical && snapshot && (
                <div style={{
                    display:        'flex',
                    gap:            16,
                    padding:        '6px 16px',
                    background:     'rgba(8,11,15,0.88)',
                    border:         '1px solid rgba(255,255,255,0.08)',
                    borderRadius:   8,
                    backdropFilter: 'blur(12px)',
                }}>
                    {[
                        { label: 'Avg Speed',  value: `${snapshot.avgNetworkSpeed} kph` },
                        { label: 'Incidents',  value: String(snapshot.incidentCount) },
                    ].map(stat => (
                        <div key={stat.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--text-muted)', letterSpacing:'0.06em', marginBottom:2 }}>
                                {stat.label}
                            </div>
                            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.8rem', fontWeight:600, color:'var(--text-primary)' }}>
                                {stat.value}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Inner overlays ────────────────────────
interface OperatorOverlaysProps {
    alerts:              Alert[];
    mapState:            MapState;
    forecastSlot:        number;
    historicalHour:      number;
    onAlertClick:        (alert: Alert) => void;
    onCorridorClick?:    (corridorId: string) => void;
    selectedCorridorId?: string;
}

function OperatorOverlays({
                              alerts,
                              mapState,
                              forecastSlot,
                              historicalHour,
                              onAlertClick,
                              onCorridorClick,
                              selectedCorridorId,
                          }: OperatorOverlaysProps) {
    const map     = useMap();
    const mapsLib = useMapsLibrary('maps');
    const vizLib  = useMapsLibrary('visualization');

    const corridorLinesRef  = useRef<google.maps.Polyline[]>([]);
    const corridorGlowsRef  = useRef<google.maps.Polyline[]>([]);
    const corridorLabelsRef = useRef<google.maps.Marker[]>([]);
    const alertMarkersRef   = useRef<google.maps.Marker[]>([]);
    const signalMarkersRef  = useRef<google.maps.Marker[]>([]);
    const cameraMarkersRef  = useRef<google.maps.Marker[]>([]);
    const heatmapRef        = useRef<google.maps.visualization.HeatmapLayer | null>(null);
    const infoWindowRef     = useRef<google.maps.InfoWindow | null>(null);

    const viewMode      = mapState.viewMode;
    const showHeatmap   = mapState.activeOverlays.includes('heatmap');
    const showCameras   = mapState.activeOverlays.includes('cameras');
    const showSignals   = mapState.activeOverlays.includes('signals');
    const showIncidents = mapState.activeOverlays.includes('incidents');
    const isHistorical  = viewMode === 'historical';
    const isForecast    = viewMode === 'forecast';
    const isLive        = viewMode === 'live';

    // ── Camera/pan sync ────────────────────
    useEffect(() => {
        if (!map) return;
        map.panTo({ lat: mapState.center.lat, lng: mapState.center.lng });
    }, [map, mapState.center.lat, mapState.center.lng]);

    useEffect(() => {
        if (!map) return;
        map.setZoom(mapState.zoom);
    }, [map, mapState.zoom]);

    // ── Corridor polylines ─────────────────
    useEffect(() => {
        if (!map || !mapsLib) return;

        corridorLinesRef.current.forEach(p => p.setMap(null));
        corridorGlowsRef.current.forEach(p => p.setMap(null));
        corridorLabelsRef.current.forEach(m => m.setMap(null));
        corridorLinesRef.current  = [];
        corridorGlowsRef.current  = [];
        corridorLabelsRef.current = [];

        CORRIDOR_LINES.forEach(corridor => {
            const isSelected = corridor.id === selectedCorridorId;

            // Determine color by mode
            let color: string;
            if (isForecast) {
                color = getForecastColor(corridor.id, forecastSlot);
            } else if (isHistorical) {
                color = getHistoricalColor(corridor.id, historicalHour);
            } else {
                color = STATUS_COLOR[corridor.status] ?? '#3b9eff';
            }

            const isDashed  = !isHistorical && (corridor.status === 'blocked' || corridor.status === 'emergency');
            const weight    = isSelected ? 5 : 3;
            const opacity   = isHistorical ? 0.6 : isSelected ? 1 : 0.85;
            const glowAlpha = isHistorical ? 0.08 : isSelected ? 0.35 : 0.15;

            const glow = new google.maps.Polyline({
                path:          corridor.path.map(([lat, lng]) => ({ lat, lng })),
                strokeColor:   color,
                strokeOpacity: glowAlpha,
                strokeWeight:  isSelected ? 16 : 10,
                map,
                zIndex: 1,
            });

            const line = new google.maps.Polyline({
                path:          corridor.path.map(([lat, lng]) => ({ lat, lng })),
                strokeColor:   color,
                strokeOpacity: isDashed ? 0 : opacity,
                strokeWeight:  weight,
                icons: isDashed ? [{
                    icon:   { path: 'M 0,-1 0,1', strokeOpacity: opacity, scale: weight },
                    offset: '0',
                    repeat: '14px',
                }] : undefined,
                map,
                zIndex: 2,
                clickable: !isHistorical,
            });

            if (onCorridorClick && !isHistorical) {
                line.addListener('click', () => onCorridorClick(corridor.id));
                glow.addListener('click', () => onCorridorClick(corridor.id));
            }

            const mid   = corridor.path[Math.floor(corridor.path.length / 2)];
            const label = new google.maps.Marker({
                position: { lat: (mid as [number, number])[0] - 0.003, lng: (mid as [number, number])[1] },
                map,
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
                label: {
                    text:       corridor.name,
                    color:      isHistorical ? '#5a6a7a' : isSelected ? '#ffffff' : color,
                    fontSize:   isSelected ? '11px' : '10px',
                    fontFamily: 'monospace',
                    fontWeight: isSelected ? '700' : '600',
                },
                zIndex:    3,
                clickable: !!onCorridorClick && !isHistorical,
            });

            if (onCorridorClick && !isHistorical) {
                label.addListener('click', () => onCorridorClick(corridor.id));
            }

            corridorGlowsRef.current.push(glow);
            corridorLinesRef.current.push(line);
            corridorLabelsRef.current.push(label);
        });

        return () => {
            corridorLinesRef.current.forEach(p => p.setMap(null));
            corridorGlowsRef.current.forEach(p => p.setMap(null));
            corridorLabelsRef.current.forEach(m => m.setMap(null));
        };
    }, [map, mapsLib, selectedCorridorId, onCorridorClick,
        viewMode, forecastSlot, historicalHour, isForecast, isHistorical]);

    // ── Alert markers ──────────────────────
    useEffect(() => {
        if (!map || !mapsLib) return;

        alertMarkersRef.current.forEach(m => m.setMap(null));
        alertMarkersRef.current = [];

        // Hide live alert markers in historical mode
        if (isHistorical) return;

        if (!infoWindowRef.current) {
            infoWindowRef.current = new google.maps.InfoWindow();
        }

        const visible = (showIncidents || isForecast)
            ? alerts
            : alerts.filter(a => a.severity === 'critical' || a.severity === 'high');

        visible.forEach(alert => {
            const color  = SEVERITY_COLOR[alert.severity] ?? '#3b9eff';
            // Dim markers in forecast mode
            const alpha  = isForecast ? 0.45 : 0.95;
            const radius = alert.severity === 'critical' ? 11
                : alert.severity === 'high'     ? 9
                    : alert.severity === 'medium'   ? 7 : 5;

            const ring = new google.maps.Marker({
                position:  { lat: alert.location.lat, lng: alert.location.lng },
                map,
                icon: {
                    path:          google.maps.SymbolPath.CIRCLE,
                    scale:         radius + 7,
                    fillColor:     color,
                    fillOpacity:   isForecast ? 0.06 : 0.12,
                    strokeColor:   color,
                    strokeOpacity: isForecast ? 0.2 : 0.35,
                    strokeWeight:  1,
                },
                zIndex: 4, optimized: false, clickable: !isForecast,
            });

            const dot = new google.maps.Marker({
                position:  { lat: alert.location.lat, lng: alert.location.lng },
                map,
                icon: {
                    path:          google.maps.SymbolPath.CIRCLE,
                    scale:         radius,
                    fillColor:     color,
                    fillOpacity:   alpha,
                    strokeColor:   '#ffffff',
                    strokeOpacity: isForecast ? 0.3 : 0.7,
                    strokeWeight:  1.5,
                },
                title:     alert.title,
                zIndex:    5, optimized: false, clickable: !isForecast,
            });

            if (!isForecast) {
                const showInfo = () => {
                    infoWindowRef.current?.setContent(`
            <div style="background:#0c1117;color:#e2e8f0;padding:10px 12px;border-radius:6px;
              font-family:monospace;font-size:11px;border:1px solid ${color}40;max-width:220px;">
              <div style="color:${color};font-weight:700;margin-bottom:4px;font-size:12px;">${alert.title}</div>
              <div style="color:#718096;margin-bottom:6px;line-height:1.5;">${alert.description}</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <span style="background:${color}20;color:${color};padding:1px 6px;border-radius:3px;
                  font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">${alert.severity}</span>
                <span style="color:#4a5568">${alert.confidence}% confidence</span>
              </div>
              <div style="color:#4a5568;margin-top:4px;">📍 ${alert.location.label}</div>
            </div>
          `);
                    infoWindowRef.current?.open(map, dot);
                    onAlertClick(alert);
                };
                dot.addListener('click', showInfo);
                ring.addListener('click', showInfo);
            }

            alertMarkersRef.current.push(ring, dot);
        });

        return () => { alertMarkersRef.current.forEach(m => m.setMap(null)); };
    }, [map, mapsLib, alerts, showIncidents, isForecast, isHistorical, onAlertClick]);

    // ── Signal markers ─────────────────────
    useEffect(() => {
        if (!map || !mapsLib) return;
        signalMarkersRef.current.forEach(m => m.setMap(null));
        signalMarkersRef.current = [];

        if (!showSignals || isHistorical) return;

        INTERSECTIONS.forEach(sig => {
            const color  = SIGNAL_COLOR[sig.status] ?? '#6b7280';
            const marker = new google.maps.Marker({
                position: { lat: sig.lat, lng: sig.lng },
                map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE, scale: 5,
                    fillColor: color, fillOpacity: 0.9,
                    strokeColor: '#ffffff', strokeOpacity: 0.5, strokeWeight: 1,
                },
                title: `Signal ${sig.id} — ${sig.status}`,
                zIndex: 6, optimized: true,
            });
            signalMarkersRef.current.push(marker);
        });

        return () => { signalMarkersRef.current.forEach(m => m.setMap(null)); };
    }, [map, mapsLib, showSignals, isHistorical]);

    // ── Camera markers ─────────────────────
    useEffect(() => {
        if (!map || !mapsLib) return;
        cameraMarkersRef.current.forEach(m => m.setMap(null));
        cameraMarkersRef.current = [];

        if (!showCameras || isHistorical) return;

        CAMERAS.forEach(cam => {
            const color  = cam.online ? '#3b9eff' : '#6b7280';
            const marker = new google.maps.Marker({
                position: { lat: cam.lat, lng: cam.lng },
                map,
                icon: {
                    path: 'M -4,-3 L 4,-3 L 4,3 L -4,3 Z M 4,-1.5 L 7,0 L 4,1.5 Z',
                    fillColor: color, fillOpacity: 0.85,
                    strokeColor: '#ffffff', strokeOpacity: 0.4, strokeWeight: 0.8, scale: 1.2,
                },
                label: { text: cam.label, color, fontSize: '9px', fontFamily: 'monospace', fontWeight: '600' },
                title: `${cam.label} — ${cam.online ? 'Online' : 'Offline'}`,
                zIndex: 7, optimized: true,
            });
            cameraMarkersRef.current.push(marker);
        });

        return () => { cameraMarkersRef.current.forEach(m => m.setMap(null)); };
    }, [map, mapsLib, showCameras, isHistorical]);

    // ── Heatmap ────────────────────────────
    useEffect(() => {
        if (!map || !vizLib) return;
        heatmapRef.current?.setMap(null);
        heatmapRef.current = null;

        if (!showHeatmap || isHistorical) return;

        const heatData = alerts.map(alert => ({
            location: new google.maps.LatLng(alert.location.lat, alert.location.lng),
            weight:   alert.severity === 'critical' ? 5
                : alert.severity === 'high'     ? 3
                    : alert.severity === 'medium'   ? 2 : 1,
        }));

        heatmapRef.current = new google.maps.visualization.HeatmapLayer({
            data: heatData, map,
            radius: 45,
            opacity: isForecast ? 0.25 : 0.55,
            gradient: [
                'rgba(0,0,0,0)', 'rgba(59,158,255,0.3)', 'rgba(245,197,24,0.5)',
                'rgba(255,136,0,0.7)', 'rgba(255,59,59,0.9)',
            ],
        });

        return () => { heatmapRef.current?.setMap(null); heatmapRef.current = null; };
    }, [map, vizLib, alerts, showHeatmap, isForecast, isHistorical]);

    return null;
}

// ── Public component ──────────────────────
interface GoogleOperatorMapProps {
    alerts:                Alert[];
    mapState:              MapState;
    forecastSlot:          number;
    historicalHour:        number;
    onAlertClick:          (alert: Alert) => void;
    onZoomChange:          (zoom: number) => void;
    onCenterChange:        (lat: number, lng: number) => void;
    onCorridorClick?:      (corridorId: string) => void;
    onForecastSlotChange:  (slot: number) => void;
    onHistoricalHourChange:(hour: number) => void;
    selectedCorridorId?:   string;
    apiKey:                string;
}

export function GoogleOperatorMap({
                                      alerts,
                                      mapState,
                                      forecastSlot,
                                      historicalHour,
                                      onAlertClick,
                                      onZoomChange,
                                      onCenterChange,
                                      onCorridorClick,
                                      onForecastSlotChange,
                                      onHistoricalHourChange,
                                      selectedCorridorId,
                                      apiKey,
                                  }: GoogleOperatorMapProps) {
    return (
        <APIProvider apiKey={apiKey} libraries={['visualization']}>
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Map
                    style={{ width: '100%', height: '100%' }}
                    defaultCenter={{ lat: -1.2921, lng: 36.8219 }}
                    defaultZoom={13}
                    //mapId="operator-map"
                    styles={DARK_MAP_STYLE}
                    disableDefaultUI
                    gestureHandling="greedy"
                    keyboardShortcuts={false}
                    backgroundColor="#080b0f"
                    onZoomChanged={e => onZoomChange(e.detail.zoom)}
                    onCenterChanged={e => onCenterChange(e.detail.center.lat, e.detail.center.lng)}
                >
                    <OperatorOverlays
                        alerts={alerts}
                        mapState={mapState}
                        forecastSlot={forecastSlot}
                        historicalHour={historicalHour}
                        onAlertClick={onAlertClick}
                        onCorridorClick={onCorridorClick}
                        selectedCorridorId={selectedCorridorId}
                    />
                </Map>

                {/* Mode UI sits outside <Map> so it's not captured by Google */}
                <ModeBanner
                    viewMode={mapState.viewMode}
                    forecastSlot={forecastSlot}
                    historicalHour={historicalHour}
                    onForecastSlotChange={onForecastSlotChange}
                    onHistoricalHourChange={onHistoricalHourChange}
                />
            </div>
        </APIProvider>
    );
}