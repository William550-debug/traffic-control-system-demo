'use client';

import { useState, useCallback, Suspense, useRef, useEffect } from 'react';
import { StatusBar }                from '@/components/status-bar/status-bar';
import { MapContainer }             from '@/components/map/map-container';
import { AlertPanel }               from '@/components/alerts/alert-panel';
import { AlertDrawer }              from '@/components/alerts/alert-drawer';
import { CrisisOverlay }            from '@/components/alerts/crisis-overlay';
import { AIRecommendationCard }     from '@/components/ai/ai-recommendation-card';
import { ActivityFeed }             from '@/components/activity/activity-feed';
import { AgencyContextBanner, RoleSwitcher } from '@/components/layout/role-guard';
import { CorridorControlPanel }     from '@/components/corridor/CorridorControlPanel';
import { ErrorBoundary }            from '@/components/layout/Error-Boundary';
import { ModeBanner }               from '@/components/modes/mode-banner';
import { ModeProvider }             from '@/providers/mode-provider';
import { MapIntelligenceOverlay }   from '@/components/map/MapIntelligenceOverlay';
import { useMapIntelligence }       from '@/hooks/use-map-intelligence';
import { PredictiveDrawer }         from '@/components/predictive/PredictiveDrawer';
import {
    AlertPanelSkeleton,
    MapSkeleton,
    ActivityFeedSkeleton,
    StatusBarSkeleton,
} from '@/components/layout/Skeletons';
import { useAlerts }          from '@/hooks/use-alerts';
import { useAlertClaim }      from '@/hooks/use-alert-claim';
import { useRecommendations } from '@/hooks/use-recommendations';
import { useAuditLog }        from '@/hooks/use-audit-log';
import { useCorridor }        from '@/hooks/use-corridor';
import { useAuth }            from '@/providers/auth-provider';
import type { Alert, Agency, SignalTiming } from '@/types';

// ─── ResizeObserver hook ──────────────────────────────────────────────────────
// Measures the exact pixel dimensions of the map stage so the intelligence
// overlay can project lat/lng to pixels accurately. Re-fires on any resize.

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const update = (w: number, h: number) =>
            setSize(prev =>
                prev.width === w && prev.height === h ? prev : { width: w, height: h }
            );

        const ro = new ResizeObserver(entries => {
            const e = entries[0];
            if (e) update(Math.floor(e.contentRect.width), Math.floor(e.contentRect.height));
        });

        ro.observe(el);
        update(el.offsetWidth, el.offsetHeight); // seed immediately
        return () => ro.disconnect();
    }, [ref]);

    return size;
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function OperatorShell() {
    const [isEmergency,    setIsEmergency]    = useState(false);
    const [drawerAlert,    setDrawerAlert]    = useState<Alert | null>(null);
    const [focusedAlertId, setFocusedAlertId] = useState<string | undefined>();

    // Ref is placed on the MAP STAGE div only — not the grid root.
    // This ensures ResizeObserver measures only the drawable map area,
    // never including the StatusBar height.
    const mapStageRef = useRef<HTMLDivElement>(null);
    const mapSize     = useContainerSize(mapStageRef);

    const { user } = useAuth();

    const {
        alerts, pendingActions,
        acknowledgeAlert, ignoreAlert, escalateAlert, dispatchAlert,
    } = useAlerts();

    const handleClaimOptimistic   = useCallback((_id: string, _agency: Agency) => {}, []);
    const handleReleaseOptimistic = useCallback((_id: string) => {}, []);

    const { claimAlert, releaseAlert, isClaiming, isReleasing } =
        useAlertClaim(handleClaimOptimistic, handleReleaseOptimistic);

    const { recommendations, approve: approveRec, reject: rejectRec, modify: modifyRec } =
        useRecommendations();

    const { logAction } = useAuditLog();

    const {
        corridors, selectedCorridor, selectCorridor,
        clearCorridor, updateTiming, lockCorridor, unlockCorridor,
    } = useCorridor();

    const {
        vehicles, flaggedVehicles, newFlag,
        dismissFlag, congestedRoads, mapStats,
    } = useMapIntelligence();

    // ── Emergency ──
    const toggleEmergency = useCallback(() => {
        setIsEmergency(prev => {
            const next = !prev;
            document.documentElement.classList.toggle('emergency', next);
            if (user) logAction({ type: next ? 'emergency_mode_activated' : 'emergency_mode_deactivated', performedBy: user.name, agency: user.agency, targetId: 'system', targetLabel: next ? 'Emergency mode activated' : 'Emergency mode deactivated' });
            return next;
        });
    }, [user, logAction]);

    // ── Alert handlers ──
    const openAlert = useCallback((alert: Alert) => {
        setFocusedAlertId(alert.id);
        setDrawerAlert(alert);
        clearCorridor();
    }, [clearCorridor]);

    const closeDrawer = useCallback(() => {
        setDrawerAlert(null);
        setFocusedAlertId(undefined);
    }, []);

    const handleApprove = useCallback((id: string) => {
        acknowledgeAlert(id);
        const a = alerts.find(x => x.id === id);
        if (user && a) logAction({ type: 'alert_approved', performedBy: user.name, agency: user.agency, targetId: id, targetLabel: a.title });
    }, [acknowledgeAlert, alerts, user, logAction]);

    const handleIgnore = useCallback((id: string, reason?: string) => {
        ignoreAlert(id, reason);
        const a = alerts.find(x => x.id === id);
        if (user && a) logAction({ type: 'alert_ignored', performedBy: user.name, agency: user.agency, targetId: id, targetLabel: a.title, details: reason ? { reason } : undefined });
        if (drawerAlert?.id === id) closeDrawer();
    }, [ignoreAlert, alerts, user, logAction, drawerAlert, closeDrawer]);

    const handleDispatch = useCallback((id: string) => {
        dispatchAlert(id);
        const a = alerts.find(x => x.id === id);
        if (user && a) logAction({ type: 'dispatch_sent', performedBy: user.name, agency: user.agency, targetId: id, targetLabel: a.title });
    }, [dispatchAlert, alerts, user, logAction]);

    const handleEscalate = useCallback((id: string) => {
        escalateAlert(id);
        const a = alerts.find(x => x.id === id);
        if (user && a) logAction({ type: 'alert_escalated', performedBy: user.name, agency: user.agency, targetId: id, targetLabel: a.title });
    }, [escalateAlert, alerts, user, logAction]);

    const handleApproveAll = useCallback((ids: string[]) => {
        ids.forEach(id => {
            acknowledgeAlert(id);
            const a = alerts.find(x => x.id === id);
            if (user && a) logAction({ type: 'alert_approved', performedBy: user.name, agency: user.agency, targetId: id, targetLabel: a.title, details: { bulk: true } });
        });
    }, [acknowledgeAlert, alerts, user, logAction]);

    const handleApproveRec = useCallback((id: string) => {
        approveRec(id);
        const r = recommendations.find(x => x.id === id);
        if (user && r) logAction({ type: 'ai_approved', performedBy: user.name, agency: user.agency, targetId: id, targetLabel: r.title });
    }, [approveRec, recommendations, user, logAction]);

    const handleRejectRec = useCallback((id: string, reason: string) => {
        rejectRec(id, reason);
        const r = recommendations.find(x => x.id === id);
        if (user && r) logAction({ type: 'ai_rejected', performedBy: user.name, agency: user.agency, targetId: id, targetLabel: r.title, details: { reason } });
    }, [rejectRec, recommendations, user, logAction]);

    const handleCorridorClick = useCallback((corridorId: string) => {
        selectCorridor(corridorId);
        closeDrawer();
    }, [selectCorridor, closeDrawer]);

    const handleUpdateTiming = useCallback((corridorId: string, timing: SignalTiming) => {
        updateTiming(corridorId, timing);
        const c = corridors.find(x => x.id === corridorId);
        if (user && c) logAction({ type: 'signal_adjusted', performedBy: user.name, agency: user.agency, targetId: corridorId, targetLabel: `${c.name} — signal timing updated` });
    }, [updateTiming, corridors, user, logAction]);

    const canOverride = user?.role === 'supervisor' || user?.permissions.includes('override_emergency') || false;

    return (
        <ModeProvider canOverride={canOverride}>
            {/*
             * ModeBanner + CrisisOverlay render as portals / position:fixed.
             * They are intentionally outside the grid so they span the full
             * viewport independently.
             */}
            <ModeBanner />
            <CrisisOverlay alerts={alerts} />

            {/*
             * ╔═══════════════════════════════════════════════════╗
             * ║  GRID ROOT                                        ║
             * ║  2 rows × 2 columns, fills 100dvh                ║
             * ║                                                   ║
             * ║  Row 1 [var(--status-bar-h)]  StatusBar (col 1–2)║
             * ║  Row 2 [1fr]                  Map | AlertPanel   ║
             * ║                                                   ║
             * ║  PredictiveStrip → PredictiveDrawer inside map   ║
             * ║  ActivityFeed    → inside alert panel column     ║
             * ╚═══════════════════════════════════════════════════╝
             *
             * Every grid cell has overflow: hidden.
             * This is the single most important rule — it clips absolute
             * children to the cell bounds and prevents cross-cell bleed.
             */}
            <div
                style={{
                    display:             'grid',
                    gridTemplateRows:    'var(--status-bar-h) 1fr',
                    gridTemplateColumns: '1fr 320px',
                    height:              '100dvh',
                    overflow:            'hidden',
                    background:          'var(--bg-void)',
                }}
            >

                {/* ══════════════════════════════════════
                    ROW 1 — StatusBar (spans both cols)
                    z-index: 10 so it always renders
                    above any map overlay at z < 10.
                ══════════════════════════════════════ */}
                <div
                    style={{
                        gridColumn: '1 / -1',
                        position:   'relative',  // stacking context
                        zIndex:     10,           // above map overlays
                        overflow:   'hidden',     // clips status bar content
                    }}
                >
                    <ErrorBoundary label="Status Bar" fallback={<StatusBarSkeleton />}>
                        <StatusBar
                            variant="operator"
                            isEmergencyMode={isEmergency}
                            onEmergencyToggle={toggleEmergency}
                        />
                    </ErrorBoundary>
                </div>

                {/* ══════════════════════════════════════
                    ROW 2 COL 1 — Map Stage
                    ─────────────────────────────────────
                    Three CSS properties work together:
                    1. position: relative   → makes this the
                       containing block for ALL absolute
                       children (MapContainer, overlays, HUDs)
                    2. overflow: hidden     → clips any absolute
                       child at this cell's edge; SVG markers,
                       vehicle dots, and HUD panels cannot
                       escape into the StatusBar or other cells
                    3. isolation: isolate   → creates a new
                       z-index stacking context so z-indexes
                       inside (0 → 40) are independent of the
                       StatusBar's z:10 outside
                ══════════════════════════════════════ */}
                <div
                    ref={mapStageRef}
                    style={{
                        position:    'relative',
                        overflow:    'hidden',
                        isolation:   'isolate',
                        borderRight: '1px solid var(--border-subtle)',
                    }}
                >
                    {/* Tile map — fills the stage */}
                    <ErrorBoundary label="Map" fallback={<MapSkeleton />}>
                        <Suspense fallback={<MapSkeleton />}>
                            <MapContainer
                                alerts={alerts}
                                onAlertClick={openAlert}
                                onCorridorClick={handleCorridorClick}
                                selectedCorridorId={selectedCorridor?.id}
                            />
                        </Suspense>
                    </ErrorBoundary>

                    {/*
                     * Map Intelligence Overlay
                     * ─────────────────────────
                     * Only mounted once we have real dimensions.
                     * The overlay's root uses:
                     *   position: absolute; top:0; left:0; width:100%; height:100%
                     * — explicit values, not "inset: 0" shorthand — so it
                     * resolves to exactly the map stage's coordinate space.
                     *
                     * The SVG inside uses overflow: hidden (not visible) so
                     * vehicle markers can't render outside the SVG viewport.
                     * HUD panels (StatsHUD, CBDDwellPanel) use position:absolute
                     * with top/bottom/left/right offsets that are relative to
                     * the overlay root — which itself is bounded to this cell.
                     */}
                    {mapSize.width > 0 && (
                        <MapIntelligenceOverlay
                            vehicles={vehicles}
                            flaggedVehicles={flaggedVehicles}
                            newFlag={newFlag}
                            dismissFlag={dismissFlag}
                            congestedRoads={congestedRoads}
                            mapStats={mapStats}
                            containerWidth={mapSize.width}
                            containerHeight={mapSize.height}
                        />
                    )}

                    {/* Existing surface overlays — unchanged */}
                    <AgencyContextBanner />
                    <AIRecommendationCard
                        recommendations={recommendations}
                        onApprove={handleApproveRec}
                        onReject={handleRejectRec}
                        onModify={modifyRec}
                    />
                    <RoleSwitcher />

                    {/*
                     * PredictiveDrawer — replaces the fixed Row 3 strip.
                     * Lives inside the map stage so it shares the same
                     * stacking context. Anchored to bottom:0 of this div,
                     * slides upward on open. z:35 keeps it above
                     * intelligence overlay panels (z:30) but below
                     * emergency tint (z:40).
                     */}
                    <PredictiveDrawer />

                    {/* Emergency tint — topmost layer inside map stage */}
                    {isEmergency && (
                        <div
                            style={{
                                position:      'absolute',
                                top:           0,
                                left:          0,
                                width:         '100%',
                                height:        '100%',
                                background:    'rgba(168,85,247,0.04)',
                                pointerEvents: 'none',
                                animation:     'fade-in 400ms ease',
                                zIndex:        40,
                            }}
                        />
                    )}
                </div>

                {/* ══════════════════════════════════════
                    ROW 2 COL 2 — Alert Panel + Activity Feed
                    Stacked flex column: alert panel takes
                    remaining height, activity feed gets a
                    fixed 140px slice at the bottom.
                ══════════════════════════════════════ */}
                <div
                    style={{
                        position:      'relative',
                        overflow:      'hidden',
                        isolation:     'isolate',
                        background:    'var(--bg-raised)',
                        display:       'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Alert panel — flex-1 fills available space */}
                    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                        <ErrorBoundary label="Alerts" fallback={<AlertPanelSkeleton />}>
                            <AlertPanel
                                alerts={alerts}
                                focusedAlertId={focusedAlertId}
                                pendingActions={pendingActions}
                                onAlertSelect={openAlert}
                                onApprove={handleApprove}
                                onIgnore={handleIgnore}
                                onDispatch={handleDispatch}
                                onEscalate={handleEscalate}
                                onApproveAll={handleApproveAll}
                            />
                        </ErrorBoundary>
                    </div>

                    {/* Activity feed — fixed 140px at the bottom of the panel */}
                    <div
                        style={{
                            height:     140,
                            flexShrink: 0,
                            overflow:   'hidden',
                            borderTop:  '1px solid var(--border-subtle)',
                        }}
                    >
                        <ErrorBoundary label="Activity" fallback={<ActivityFeedSkeleton />}>
                            <ActivityFeed />
                        </ErrorBoundary>
                    </div>
                </div>

            </div>

            {/*
             * Drawers live outside the grid — shadcn Sheet renders a
             * position:fixed portal so they overlay the full viewport.
             */}
            <AlertDrawer
                alert={drawerAlert}
                onClose={closeDrawer}
                onApprove={handleApprove}
                onIgnore={handleIgnore}
                onDispatch={handleDispatch}
                onEscalate={handleEscalate}
                onClaim={claimAlert}
                onRelease={releaseAlert}
                isClaiming={drawerAlert ? isClaiming(drawerAlert.id) : false}
                isReleasing={drawerAlert ? isReleasing(drawerAlert.id) : false}
            />

            <CorridorControlPanel
                corridor={selectedCorridor}
                onClose={clearCorridor}
                onUpdateTiming={handleUpdateTiming}
                onLock={lockCorridor}
                onUnlock={unlockCorridor}
            />
        </ModeProvider>
    );
}