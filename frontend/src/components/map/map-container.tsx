'use client';

import dynamic from 'next/dynamic';
import { useMap } from '@/hooks/use-map';
import { MapControls } from './map-controls';
import type { Alert } from '@/types';

const GoogleOperatorMap = dynamic(
    () => import('./GoogleOperatorMap').then(m => ({ default: m.GoogleOperatorMap })),
    { ssr: false, loading: () => <MapLoadingState /> }
);

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

function MapLoadingState() {
    // Inline-style CSS custom properties (var(--...)) cannot be validated by
    // IDE CSS linters, so this loading state uses literal token equivalents.
    // These values intentionally mirror the dark-theme design tokens.
    const GRID_LINE   = 'rgba(255,255,255,0.06)';   // --border-subtle
    const ACCENT      = '#3b9eff';                   // --accent-primary
    const BG_BASE     = '#080b0f';                   // --bg-base
    const TEXT_MUTED  = '#6b7280';                   // --text-muted

    return (
        <div style={{
            width:'100%', height:'100%', background: BG_BASE,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:10, position:'relative', overflow:'hidden',
        }}>
            <div style={{
                position:'absolute', inset:0,
                backgroundImage:`linear-gradient(${GRID_LINE} 1px,transparent 1px),linear-gradient(90deg,${GRID_LINE} 1px,transparent 1px)`,
                backgroundSize:'40px 40px',
            }} />
            <div style={{
                position:'absolute', left:0, right:0, height:2,
                background:`linear-gradient(90deg,transparent,${ACCENT},transparent)`,
                opacity:0.2, animation:'scan-line 3s linear infinite',
            }} />
            <span style={{
                position:'relative', fontFamily:'var(--font-mono)', fontSize:'0.6rem',
                letterSpacing:'0.12em', textTransform:'uppercase', color: TEXT_MUTED,
            }}>
                LOADING MAP
            </span>
            <div style={{ position:'relative', display:'flex', gap:4 }}>
                {[0,1,2].map(i => (
                    <div key={i} style={{
                        width:4, height:4, borderRadius:'50%',
                        background: ACCENT,
                        animation:`pulse-dot 1.2s ease ${i*0.2}s infinite`,
                    }} />
                ))}
            </div>
        </div>
    );
}

interface MapContainerProps {
    alerts:              Alert[];
    onAlertClick:        (alert: Alert) => void;
    onCorridorClick?:    (corridorId: string) => void;
    selectedCorridorId?: string;
    /** Pre-center the map on a specific coordinate (e.g. an incident location). */
    initialCenter?:      { lat: number; lng: number };
    /** Initial zoom override — defaults to 15 when initialCenter is set, 13 otherwise. */
    initialZoom?:        number;
}

export function MapContainer({
                                 alerts,
                                 onAlertClick,
                                 onCorridorClick,
                                 selectedCorridorId,
                                 initialCenter,
                                 initialZoom,
                             }: MapContainerProps) {
    const {
        mapState,
        forecastSlot,
        historicalHour,
        setViewMode,
        toggleOverlay,
        focusAlert,
        setZoom,
        setForecastSlot,
        setHistoricalHour,
        resetView,
        setCenter,
    } = useMap();

    const handleAlertClick = (alert: Alert) => {
        focusAlert(alert.id, alert.location.lat, alert.location.lng);
        onAlertClick(alert);
    };

    return (
        <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden' }}>
            <GoogleOperatorMap
                mapState={mapState}
                alerts={alerts}
                forecastSlot={forecastSlot}
                historicalHour={historicalHour}
                onAlertClick={handleAlertClick}
                onZoomChange={setZoom}
                onCenterChange={(lat, lng) => setCenter(lat, lng)}
                onCorridorClick={onCorridorClick}
                onForecastSlotChange={setForecastSlot}
                onHistoricalHourChange={setHistoricalHour}
                selectedCorridorId={selectedCorridorId}
                apiKey={MAPS_API_KEY}
                initialCenter={initialCenter}
                initialZoom={initialZoom}
            />
            <MapControls
                mapState={mapState}
                onViewMode={setViewMode}
                onToggleOverlay={toggleOverlay}
                onZoomIn={() => setZoom(Math.min(mapState.zoom + 1, 19))}
                onZoomOut={() => setZoom(Math.max(mapState.zoom - 1, 9))}
                onReset={resetView}
            />
        </div>
    );
}