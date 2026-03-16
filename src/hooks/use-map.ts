'use client';

import { useState, useCallback } from 'react';
import type { MapState, MapOverlay } from '@/types';

const NAIROBI_CENTER = { lat: -1.2921, lng: 36.8219 };

const DEFAULT_STATE: MapState = {
    center:         NAIROBI_CENTER,
    zoom:           13,
    activeOverlays: ['heatmap', 'cameras', 'signals', 'incidents'],
    viewMode:       'live',
    focusedAlertId:    undefined,
    focusedCorridorId: undefined,
};

interface UseMapReturn {
    mapState:          MapState;
    forecastSlot:      number;
    historicalHour:    number;
    setCenter:         (lat: number, lng: number, zoom?: number) => void;
    setZoom:           (zoom: number) => void;
    setViewMode:       (mode: MapState['viewMode']) => void;
    setForecastSlot:   (slot: number) => void;
    setHistoricalHour: (hour: number) => void;
    toggleOverlay:     (overlay: MapOverlay) => void;
    focusAlert:        (alertId: string, lat: number, lng: number) => void;
    focusCorridor:     (corridorId: string) => void;
    clearFocus:        () => void;
    resetView:         () => void;
}

export function useMap(): UseMapReturn {
    const [mapState, setMapState]             = useState<MapState>(DEFAULT_STATE);
    const [forecastSlot, setForecastSlot]     = useState(0);
    const [historicalHour, setHistoricalHour] = useState(5);

    const setCenter = useCallback((lat: number, lng: number, zoom?: number) => {
        setMapState(prev => ({
            ...prev,
            center: { lat, lng },
            ...(zoom !== undefined ? { zoom } : {}),
        }));
    }, []);

    const setZoom = useCallback((zoom: number) => {
        setMapState(prev => ({ ...prev, zoom }));
    }, []);

    const setViewMode = useCallback((mode: MapState['viewMode']) => {
        setMapState(prev => ({ ...prev, viewMode: mode }));
        if (mode === 'forecast')   setForecastSlot(0);
        if (mode === 'historical') setHistoricalHour(5);
    }, []);

    const toggleOverlay = useCallback((overlay: MapOverlay) => {
        setMapState(prev => ({
            ...prev,
            activeOverlays: prev.activeOverlays.includes(overlay)
                ? prev.activeOverlays.filter(o => o !== overlay)
                : [...prev.activeOverlays, overlay],
        }));
    }, []);

    const focusAlert = useCallback((alertId: string, lat: number, lng: number) => {
        setMapState(prev => ({
            ...prev,
            center:            { lat, lng },
            zoom:              16,
            focusedAlertId:    alertId,
            focusedCorridorId: undefined,
        }));
    }, []);

    const focusCorridor = useCallback((corridorId: string) => {
        setMapState(prev => ({
            ...prev,
            focusedCorridorId: corridorId,
            focusedAlertId:    undefined,
        }));
    }, []);

    const clearFocus = useCallback(() => {
        setMapState(prev => ({
            ...prev,
            focusedAlertId:    undefined,
            focusedCorridorId: undefined,
        }));
    }, []);

    const resetView = useCallback(() => {
        setMapState(DEFAULT_STATE);
        setForecastSlot(0);
        setHistoricalHour(5);
    }, []);

    return {
        mapState,
        forecastSlot,
        historicalHour,
        setCenter,
        setZoom,
        setViewMode,
        setForecastSlot,
        setHistoricalHour,
        toggleOverlay,
        focusAlert,
        focusCorridor,
        clearFocus,
        resetView,
    };
}