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
    return (
        <div style={{
            width:'100%', height:'100%', background:'var(--bg-base)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:10, position:'relative', overflow:'hidden',
        }}>
            <div style={{
                position:'absolute', inset:0,
                backgroundImage:`linear-gradient(var(--border-subtle) 1px,transparent 1px),linear-gradient(90deg,var(--border-subtle) 1px,transparent 1px)`,
                backgroundSize:'40px 40px',
            }} />
            <div style={{
                position:'absolute', left:0, right:0, height:2,
                background:'linear-gradient(90deg,transparent,var(--accent-primary),transparent)',
                opacity:0.2, animation:'scan-line 3s linear infinite',
            }} />
            <span style={{ position:'relative', fontFamily:'var(--font-mono)', fontSize:'0.6rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--text-muted)' }}>
        LOADING MAP
      </span>
            <div style={{ position:'relative', display:'flex', gap:4 }}>
                {[0,1,2].map(i => (
                    <div key={i} style={{
                        width:4, height:4, borderRadius:'50%',
                        background:'var(--accent-primary)',
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
}

export function MapContainer({
                                 alerts,
                                 onAlertClick,
                                 onCorridorClick,
                                 selectedCorridorId,
                             }: MapContainerProps) {
    const {
        mapState,
        setViewMode,
        toggleOverlay,
        focusAlert,
        setZoom,
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
                onAlertClick={handleAlertClick}
                onZoomChange={setZoom}
                onCenterChange={(lat, lng) => setCenter(lat, lng)}
                onCorridorClick={onCorridorClick}
                selectedCorridorId={selectedCorridorId}
                apiKey={MAPS_API_KEY}
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