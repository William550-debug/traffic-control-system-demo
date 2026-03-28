'use client';

import { useEffect, useRef } from 'react';
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

// Road names below are Kenyan proper nouns — add them to your project
// spellcheck dictionary (.cspell.json / .vscode/settings.json) if flagged.
/* spellchecker: disable */
const CORRIDOR_LINES = [
    { id: 'corridor-001', name: 'CBD Ring Road',      status: 'blocked'   as CorridorStatus, path: [[-1.2832,36.8172],[-1.2856,36.8195],[-1.2880,36.8220],[-1.2910,36.8235],[-1.2935,36.8218],[-1.2950,36.8192]] },
    { id: 'corridor-002', name: 'Uhuru Highway',      status: 'congested' as CorridorStatus, path: [[-1.2820,36.8163],[-1.2870,36.8163],[-1.2930,36.8163],[-1.2990,36.8163],[-1.3060,36.8163]] },
    { id: 'corridor-003', name: 'Ngong Road',         status: 'congested' as CorridorStatus, path: [[-1.2920,36.8050],[-1.2960,36.7970],[-1.3010,36.7900],[-1.3010,36.7840],[-1.3010,36.7770]] },
    { id: 'corridor-004', name: 'Thika Superhighway', status: 'emergency' as CorridorStatus, path: [[-1.2750,36.8290],[-1.2700,36.8320],[-1.2660,36.8350],[-1.2631,36.8370],[-1.2590,36.8410]] },
    { id: 'corridor-005', name: 'Mombasa Road',       status: 'normal'    as CorridorStatus, path: [[-1.3100,36.8260],[-1.3150,36.8310],[-1.3200,36.8390],[-1.3280,36.8470],[-1.3350,36.8530]] },
] as const;
/* spellchecker: enable */

// ── Color maps ───────────────────────────
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
    if (!hotspot) return '#22c55e40';
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

// ── Inject alert-ring keyframes once into <head> ──────────────────────────────
// AdvancedMarkerElement content is real DOM — we can use CSS animations on it.
let _keyframesInjected = false;
function ensureKeyframes() {
    if (_keyframesInjected || typeof document === 'undefined') return;
    _keyframesInjected = true;
    const style = document.createElement('style');
    style.textContent = `
        @keyframes atms-ring-pulse {
            0%, 100% { opacity: 0.35; transform: scale(1);    }
            50%       { opacity: 0.08; transform: scale(1.35); }
        }`;
    document.head.appendChild(style);
}

// ── Marker content factory functions ─────────────────────────────────────────
// These return plain HTMLElement instances for use as AdvancedMarkerElement
// content — replacing the deprecated google.maps.Marker icon API.

function makeSignalEl(color: string): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = [
        'width:10px', 'height:10px', 'border-radius:50%',
        `background:${color}`, 'opacity:0.9',
        'border:1px solid rgba(255,255,255,0.5)',
        'pointer-events:none',
    ].join(';');
    return el;
}

function makeCameraEl(color: string, label: string): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;align-items:center;gap:2px;pointer-events:none;';
    el.innerHTML = `
        <svg width="16" height="12" viewBox="-4 -3 11 7"
             fill="${color}" fill-opacity="0.85"
             stroke="white" stroke-opacity="0.4" stroke-width="0.8">
            <rect x="-4" y="-3" width="8" height="6" rx="0.5"/>
            <polygon points="4,-1.5 7,0 4,1.5"/>
        </svg>
        <span style="font-family:monospace;font-size:9px;color:${color};font-weight:600;white-space:nowrap;">${label}</span>
    `;
    return el;
}

function makeAlertEl(opts: {
    color:      string;
    radius:     number;
    alpha:      number;
    isForecast: boolean;
}): HTMLElement {
    ensureKeyframes();
    const { color, radius, alpha, isForecast } = opts;
    const outer = (radius + 7) * 2;
    const inner = radius * 2;

    const el = document.createElement('div');
    el.style.cssText = [
        `width:${outer}px`, `height:${outer}px`,
        'position:relative',
        'display:flex', 'align-items:center', 'justify-content:center',
    ].join(';');

    const ring = document.createElement('div');
    ring.style.cssText = [
        'position:absolute',
        `width:${outer}px`, `height:${outer}px`,
        'border-radius:50%',
        `background:${color}`,
        `opacity:${isForecast ? 0.06 : 0.12}`,
        `border:1px solid ${color}`,
        ...(!isForecast ? ['animation:atms-ring-pulse 2s ease infinite'] : []),
    ].join(';');

    const dot = document.createElement('div');
    dot.style.cssText = [
        `width:${inner}px`, `height:${inner}px`,
        'border-radius:50%',
        `background:${color}`,
        `opacity:${alpha}`,
        `border:1.5px solid rgba(255,255,255,${isForecast ? 0.3 : 0.7})`,
        'position:relative',
        `cursor:${isForecast ? 'default' : 'pointer'}`,
    ].join(';');

    el.appendChild(ring);
    el.appendChild(dot);
    return el;
}

function makeCorridorLabelEl(opts: {
    name:        string;
    color:       string;
    isSelected:  boolean;
    isHistorical:boolean;
    clickable:   boolean;
}): HTMLElement {
    const { name, color, isSelected, isHistorical, clickable } = opts;
    const el = document.createElement('div');
    el.style.cssText = [
        'font-family:monospace',
        `font-size:${isSelected ? '11px' : '10px'}`,
        `color:${isHistorical ? '#5a6a7a' : isSelected ? '#ffffff' : color}`,
        `font-weight:${isSelected ? '700' : '600'}`,
        'background:rgba(8,11,15,0.7)',
        'padding:1px 4px',
        'border-radius:3px',
        'white-space:nowrap',
        `cursor:${clickable ? 'pointer' : 'default'}`,
        `pointer-events:${clickable ? 'auto' : 'none'}`,
    ].join(';');
    el.textContent = name;
    return el;
}

// ── Mode banner overlay (HTML positioned over map) ────────────────────────────
interface ModeBannerProps {
    viewMode:               MapState['viewMode'];
    forecastSlot:           number;
    historicalHour:         number;
    onForecastSlotChange:   (i: number) => void;
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
    const snapshot     = isHistorical ? MOCK_HISTORICAL[historicalHour] : null;

    return (
        <div style={{
            position:      'absolute',
            bottom:        16,
            left:          '50%',
            transform:     'translateX(-50%)',
            zIndex:        500,
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           8,
            pointerEvents: 'auto',
        }}>
            {/* Mode pill */}
            <div style={{
                padding:       '3px 12px',
                background:    `${accentColor}20`,
                border:        `1px solid ${accentColor}50`,
                borderRadius:  20,
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.55rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color:         accentColor,
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

            {/* Historical stats */}
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
                        { label: 'Avg Speed', value: `${snapshot.avgNetworkSpeed} kph` },
                        { label: 'Incidents', value: String(snapshot.incidentCount) },
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

// Convenience alias for the verbose type name
type AdvancedMarker = google.maps.marker.AdvancedMarkerElement;

function OperatorOverlays({
                              alerts,
                              mapState,
                              forecastSlot,
                              historicalHour,
                              onAlertClick,
                              onCorridorClick,
                              selectedCorridorId,
                          }: OperatorOverlaysProps) {
    const map       = useMap();
    const mapsLib   = useMapsLibrary('maps');
    // Requesting 'marker' ensures google.maps.marker.AdvancedMarkerElement is
    // available before any of the effects below attempt to instantiate markers.
    const markerLib = useMapsLibrary('marker');
    const vizLib    = useMapsLibrary('visualization');

    const corridorLinesRef  = useRef<google.maps.Polyline[]>([]);
    const corridorGlowsRef  = useRef<google.maps.Polyline[]>([]);
    const corridorLabelsRef = useRef<AdvancedMarker[]>([]);
    const alertMarkersRef   = useRef<AdvancedMarker[]>([]);
    const signalMarkersRef  = useRef<AdvancedMarker[]>([]);
    const cameraMarkersRef  = useRef<AdvancedMarker[]>([]);
    const heatmapRef        = useRef<google.maps.visualization.HeatmapLayer | null>(null);
    const infoWindowRef     = useRef<google.maps.InfoWindow | null>(null);

    const viewMode      = mapState.viewMode;
    const showHeatmap   = mapState.activeOverlays.includes('heatmap');
    const showCameras   = mapState.activeOverlays.includes('cameras');
    const showSignals   = mapState.activeOverlays.includes('signals');
    const showIncidents = mapState.activeOverlays.includes('incidents');
    const isHistorical  = viewMode === 'historical';
    const isForecast    = viewMode === 'forecast';

    // ── Pan / zoom sync ────────────────────
    useEffect(() => {
        if (!map) return;
        map.panTo({ lat: mapState.center.lat, lng: mapState.center.lng });
    }, [map, mapState.center.lat, mapState.center.lng]);

    useEffect(() => {
        if (!map) return;
        map.setZoom(mapState.zoom);
    }, [map, mapState.zoom]);

    // ── Corridor polylines + labels ────────
    useEffect(() => {
        if (!map || !mapsLib || !markerLib) return;

        // Extracted cleanup used both as setup teardown and as return value
        const clearCorridors = () => {
            corridorLinesRef.current.forEach(p  => p.setMap(null));
            corridorGlowsRef.current.forEach(p  => p.setMap(null));
            corridorLabelsRef.current.forEach(m => { m.map = null; });
            corridorLinesRef.current  = [];
            corridorGlowsRef.current  = [];
            corridorLabelsRef.current = [];
        };
        clearCorridors();

        CORRIDOR_LINES.forEach(corridor => {
            const isSelected = corridor.id === selectedCorridorId;

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
                zIndex:    2,
                clickable: !isHistorical,
            });

            if (onCorridorClick && !isHistorical) {
                line.addListener('click', () => onCorridorClick(corridor.id));
                glow.addListener('click', () => onCorridorClick(corridor.id));
            }

            const mid       = corridor.path[Math.floor(corridor.path.length / 2)];
            const isClickable = !!onCorridorClick && !isHistorical;
            const labelEl   = makeCorridorLabelEl({ name: corridor.name, color, isSelected, isHistorical, clickable: isClickable });

            const label = new google.maps.marker.AdvancedMarkerElement({
                position:     { lat: (mid as [number, number])[0] - 0.003, lng: (mid as [number, number])[1] },
                map,
                content:      labelEl,
                zIndex:       3,
                gmpClickable: isClickable,
            });

            if (isClickable) {
                label.addListener('click', () => onCorridorClick!(corridor.id));
            }

            corridorGlowsRef.current.push(glow);
            corridorLinesRef.current.push(line);
            corridorLabelsRef.current.push(label);
        });

        return clearCorridors;
    }, [map, mapsLib, markerLib, selectedCorridorId, onCorridorClick,
        viewMode, forecastSlot, historicalHour, isForecast, isHistorical]);

    // ── Alert markers ──────────────────────
    useEffect(() => {
        if (!map || !mapsLib || !markerLib) return;

        const clearAlerts = () => {
            alertMarkersRef.current.forEach(m => { m.map = null; });
            alertMarkersRef.current = [];
        };
        clearAlerts();

        if (isHistorical) return;

        if (!infoWindowRef.current) {
            infoWindowRef.current = new google.maps.InfoWindow();
        }

        const visible = (showIncidents || isForecast)
            ? alerts
            : alerts.filter(a => a.severity === 'critical' || a.severity === 'high');

        visible.forEach(alert => {
            const color  = SEVERITY_COLOR[alert.severity] ?? '#3b9eff';
            const alpha  = isForecast ? 0.45 : 0.95;
            const radius = alert.severity === 'critical' ? 11
                : alert.severity === 'high'              ? 9
                    : alert.severity === 'medium'            ? 7 : 5;

            const content = makeAlertEl({ color, radius, alpha, isForecast });

            const marker = new google.maps.marker.AdvancedMarkerElement({
                position:     { lat: alert.location.lat, lng: alert.location.lng },
                map,
                content,
                title:        alert.title,
                zIndex:       5,
                gmpClickable: !isForecast,
            });

            if (!isForecast) {
                marker.addEventListener('gmp-click', () => {
                    infoWindowRef.current?.setContent(`
                        <div style="background:#0c1117;color:#e2e8f0;padding:10px 12px;border-radius:6px;
                             font-family:monospace;font-size:11px;border:1px solid ${color}40;max-width:220px;">
                          <div style="color:${color};font-weight:700;margin-bottom:4px;font-size:12px;">${alert.title}</div>
                          <div style="color:#718096;margin-bottom:6px;line-height:1.5;">${alert.description}</div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                           <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
  <span
    style={{
      background: \`${color}20\`,
      color: color,
      padding: '1px 6px',
      borderRadius: '3px',
      fontSize: '10px',
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    }}
  >
    {alert.severity}
  </span>
  <span style={{ color: '#4a5568' }}>
    {alert.confidence}% confidence
  </span>
</div>
                          <div style="color:#4a5568;margin-top:4px;">📍 ${alert.location.label}</div>
                        </div>
                    `);
                    // InfoWindow.open accepts an AdvancedMarkerElement as anchor
                    infoWindowRef.current?.open({ anchor: marker, map });
                    onAlertClick(alert);
                });
            }

            alertMarkersRef.current.push(marker);
        });

        return clearAlerts;
    }, [map, mapsLib, markerLib, alerts, showIncidents, isForecast, isHistorical, onAlertClick]);

    // ── Shared helper: simple point-marker layer ───
    // Extracted to avoid the duplicate signal/camera effect pattern.
    // Creates AdvancedMarkerElements from a data array, clears on re-run.
    function makeSimpleMarkerLayer<T extends { lat: number; lng: number }>(
        items:   T[],
        ref:     React.MutableRefObject<AdvancedMarker[]>,
        build:   (item: T) => { content: HTMLElement; title: string; zIndex: number },
    ) {
        ref.current.forEach(m => { m.map = null; });
        ref.current = [];
        items.forEach(item => {
            const { content, title, zIndex } = build(item);
            const marker = new google.maps.marker.AdvancedMarkerElement({
                position: { lat: item.lat, lng: item.lng },
                map, content, title, zIndex,
            });
            ref.current.push(marker);
        });
        return () => { ref.current.forEach(m => { m.map = null; }); ref.current = []; };
    }

    // ── Signal markers ─────────────────────
    useEffect(() => {
        if (!map || !mapsLib || !markerLib || !showSignals || isHistorical) {
            signalMarkersRef.current.forEach(m => { m.map = null; });
            signalMarkersRef.current = [];
            return;
        }
        return makeSimpleMarkerLayer(
            INTERSECTIONS,
            signalMarkersRef,
            sig => ({
                content: makeSignalEl(SIGNAL_COLOR[sig.status] ?? '#6b7280'),
                title:   `Signal ${sig.id} — ${sig.status}`,
                zIndex:  6,
            }),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, mapsLib, markerLib, showSignals, isHistorical]);

    // ── Camera markers ─────────────────────
    useEffect(() => {
        if (!map || !mapsLib || !markerLib || !showCameras || isHistorical) {
            cameraMarkersRef.current.forEach(m => { m.map = null; });
            cameraMarkersRef.current = [];
            return;
        }
        return makeSimpleMarkerLayer(
            CAMERAS,
            cameraMarkersRef,
            cam => ({
                content: makeCameraEl(cam.online ? '#3b9eff' : '#6b7280', cam.label),
                title:   `${cam.label} — ${cam.online ? 'Online' : 'Offline'}`,
                zIndex:  7,
            }),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, mapsLib, markerLib, showCameras, isHistorical]);

    // ── Heatmap ────────────────────────────
    useEffect(() => {
        if (!map || !vizLib) return;
        heatmapRef.current?.setMap(null);
        heatmapRef.current = null;

        if (!showHeatmap || isHistorical) return;

        const heatData = alerts.map(alert => ({
            location: new google.maps.LatLng(alert.location.lat, alert.location.lng),
            weight:   alert.severity === 'critical' ? 5
                : alert.severity === 'high'         ? 3
                    : alert.severity === 'medium'       ? 2 : 1,
        }));

        heatmapRef.current = new google.maps.visualization.HeatmapLayer({
            data:    heatData,
            map,
            radius:  45,
            opacity: isForecast ? 0.25 : 0.55,
            gradient: [
                'rgba(0,0,0,0)',
                'rgba(59,158,255,0.3)',
                'rgba(245,197,24,0.5)',
                'rgba(255,136,0,0.7)',
                'rgba(255,59,59,0.9)',
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
    /**
     * Pre-center the map on a specific coordinate (e.g. an incident location).
     * Defaults to Nairobi CBD when omitted.
     */
    initialCenter?: { lat: number; lng: number };
    /**
     * Initial zoom override.
     * Defaults to 15 when initialCenter is provided, 13 (city overview) otherwise.
     */
    initialZoom?:   number;
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
                                      initialCenter,
                                      initialZoom,
                                  }: GoogleOperatorMapProps) {
    // Incident view zooms to street level; city overview stays at 13.
    const resolvedCenter = initialCenter ?? { lat: -1.2921, lng: 36.8219 };
    const resolvedZoom   = initialZoom   ?? (initialCenter ? 15 : 13);

    return (
        // Both 'visualization' (heatmap) and 'marker' (AdvancedMarkerElement)
        // must be listed so their namespaces are available before overlays run.
        <APIProvider apiKey={apiKey} libraries={['visualization', 'marker']}>
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Map
                    style={{ width: '100%', height: '100%' }}
                    defaultCenter={resolvedCenter}
                    defaultZoom={resolvedZoom}
                    // mapId — enable when using cloud-based map styling.
                    // Add NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID to .env.local and
                    // uncomment the line below to activate.
                    mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
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

                {/* ModeBanner is outside <Map> so Google's event system does not capture it */}
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