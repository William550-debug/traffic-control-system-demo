'use client';

import { useState, useCallback, Suspense } from 'react';
import { StatusBar }                from '@/components/status-bar/status-bar';
import { MapContainer }             from '@/components/map/map-container';
import { AlertPanel }               from '@/components/alerts/alert-panel';
import { AlertDrawer }              from '@/components/alerts/alert-drawer';
import { CrisisOverlay }            from '@/components/alerts/crisis-overlay';
import { AIRecommendationCard }     from '@/components/ai/ai-recommendation-card';
import { PredictiveStrip }          from '@/components/predictive/predictive-strip';
import { ActivityFeed }             from '@/components/activity/activity-feed';
import { AgencyContextBanner, RoleSwitcher } from '@/components/layout/role-guard';
import { CorridorControlPanel }     from "@/components/corridor/CorridorControlPanel"
import { ErrorBoundary }            from "@/components/layout/Error-Boundary"
import { ModeBanner }               from '@/components/modes/mode-banner';
import { ModeProvider }             from '@/providers/mode-provider';
import {
    AlertPanelSkeleton,
    MapSkeleton,
    PredictiveSkeleton,
    ActivityFeedSkeleton,
    StatusBarSkeleton,
} from '@/components/layout/Skeletons';
import { useAlerts }          from '@/hooks/use-alerts';
import { useRecommendations } from '@/hooks/use-recommendations';
import { useAuditLog }        from '@/hooks/use-audit-log';
import { useCorridor }        from '@/hooks/use-corridor';
import { useAuth }            from '@/providers/auth-provider';
import type { Alert }         from '@/types';

export function OperatorShell() {
    const [isEmergency,    setIsEmergency]    = useState(false);
    const [drawerAlert,    setDrawerAlert]    = useState<Alert | null>(null);
    const [focusedAlertId, setFocusedAlertId] = useState<string | undefined>();

    const { user } = useAuth();

    const { alerts, acknowledgeAlert, ignoreAlert, dispatchAlert, escalateAlert, pendingActions } = useAlerts();
    const { recommendations, approve: approveRec, reject: rejectRec, modify: modifyRec } = useRecommendations();
    const { logAction } = useAuditLog();
    const {
        corridors,
        selectedCorridor,
        selectCorridor,
        clearCorridor,
        updateTiming,
        lockCorridor,
        unlockCorridor,
    } = useCorridor();

    // ── Emergency ────────────────────────────
    const toggleEmergency = useCallback(() => {
        setIsEmergency(prev => {
            const next = !prev;
            document.documentElement.classList.toggle('emergency', next);
            if (user) {
                logAction({
                    type:        next ? 'emergency_mode_activated' : 'emergency_mode_deactivated',
                    performedBy: user.name,
                    agency:      user.agency,
                    targetId:    'system',
                    targetLabel: next ? 'Emergency mode activated' : 'Emergency mode deactivated',
                });
            }
            return next;
        });
    }, [user, logAction]);

    // ── Alerts ────────────────────────────────
    const openAlert = useCallback((alert: Alert) => {
        setFocusedAlertId(alert.id);
        setDrawerAlert(alert);
        clearCorridor(); // close corridor panel if open
    }, [clearCorridor]);

    const closeDrawer = useCallback(() => {
        setDrawerAlert(null);
        setFocusedAlertId(undefined);
    }, []);

    const handleApprove = useCallback((id: string) => {
        acknowledgeAlert(id);
        const alert = alerts.find(a => a.id === id);
        if (user && alert) {
            logAction({
                type: 'alert_approved', performedBy: user.name,
                agency: user.agency, targetId: id, targetLabel: alert.title,
            });
        }
    }, [acknowledgeAlert, alerts, user, logAction]);

    const handleIgnore = useCallback((id: string, reason?: string) => {
        ignoreAlert(id, reason);
        const alert = alerts.find(a => a.id === id);
        if (user && alert) {
            logAction({
                type: 'alert_ignored', performedBy: user.name,
                agency: user.agency, targetId: id, targetLabel: alert.title,
                details: reason ? { reason } : undefined,
            });
        }
        if (drawerAlert?.id === id) closeDrawer();
    }, [ignoreAlert, alerts, user, logAction, drawerAlert, closeDrawer]);

    const handleDispatch = useCallback((id: string) => {
        dispatchAlert(id);
        const alert = alerts.find(a => a.id === id);
        if (user && alert) {
            logAction({
                type: 'dispatch_sent', performedBy: user.name,
                agency: user.agency, targetId: id, targetLabel: alert.title,
            });
        }
    }, [dispatchAlert, alerts, user, logAction]);

    const handleEscalate = useCallback((id: string) => {
        escalateAlert(id);
        const alert = alerts.find(a => a.id === id);
        if (user && alert) {
            logAction({
                type: 'alert_escalated', performedBy: user.name,
                agency: user.agency, targetId: id, targetLabel: alert.title,
            });
        }
    }, [escalateAlert, alerts, user, logAction]);

    const handleApproveAll = useCallback((ids: string[]) => {
        ids.forEach(id => {
            acknowledgeAlert(id);
            const alert = alerts.find(a => a.id === id);
            if (user && alert) {
                logAction({
                    type: 'alert_approved', performedBy: user.name,
                    agency: user.agency, targetId: id, targetLabel: alert.title,
                    details: { bulk: true },
                });
            }
        });
    }, [acknowledgeAlert, alerts, user, logAction]);

    // ── AI recs ───────────────────────────────
    const handleApproveRec = useCallback((id: string) => {
        approveRec(id);
        const rec = recommendations.find(r => r.id === id);
        if (user && rec) {
            logAction({
                type: 'ai_approved', performedBy: user.name,
                agency: user.agency, targetId: id, targetLabel: rec.title,
            });
        }
    }, [approveRec, recommendations, user, logAction]);

    const handleRejectRec = useCallback((id: string, reason: string) => {
        rejectRec(id, reason);
        const rec = recommendations.find(r => r.id === id);
        if (user && rec) {
            logAction({
                type: 'ai_rejected', performedBy: user.name,
                agency: user.agency, targetId: id, targetLabel: rec.title,
                details: { reason },
            });
        }
    }, [rejectRec, recommendations, user, logAction]);

    // ── Corridors ─────────────────────────────
    const handleCorridorClick = useCallback((corridorId: string) => {
        selectCorridor(corridorId);
        closeDrawer(); // close alert drawer if open
    }, [selectCorridor, closeDrawer]);

    const handleUpdateTiming = useCallback((corridorId: string, timing: import('@/types').SignalTiming) => {
        updateTiming(corridorId, timing);
        const corridor = corridors.find(c => c.id === corridorId);
        if (user && corridor) {
            logAction({
                type: 'signal_adjusted', performedBy: user.name,
                agency: user.agency, targetId: corridorId,
                targetLabel: `${corridor.name} — signal timing updated`,
            });
        }
    }, [updateTiming, corridors, user, logAction]);

    const canOverride = user?.role === 'supervisor' || user?.permissions.includes('override_emergency') || false;

    return (
        <ModeProvider canOverride={canOverride}>
            <ModeBanner />

            <CrisisOverlay alerts={alerts} />

            <div style={{
                display:             'grid',
                gridTemplateRows:    'var(--status-bar-h) 1fr 140px',
                gridTemplateColumns: '1fr 300px',
                height:              '100dvh',
                overflow:            'hidden',
                background:          'var(--bg-void)',
            }}>

                {/* ── Status Bar ── */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <ErrorBoundary label="Status Bar" fallback={<StatusBarSkeleton />}>
                        <StatusBar
                            variant="operator"
                            isEmergencyMode={isEmergency}
                            onEmergencyToggle={toggleEmergency}
                        />
                    </ErrorBoundary>
                </div>

                {/* ── Map ── */}
                <div style={{ position: 'relative', overflow: 'hidden' }}>
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

                    <AgencyContextBanner />

                    <AIRecommendationCard
                        recommendations={recommendations}
                        onApprove={handleApproveRec}
                        onReject={handleRejectRec}
                        onModify={modifyRec}
                    />

                    <RoleSwitcher />

                    {isEmergency && (
                        <div style={{
                            position:      'absolute',
                            inset:         0,
                            background:    'rgba(168,85,247,0.04)',
                            pointerEvents: 'none',
                            animation:     'fade-in 400ms ease',
                        }} />
                    )}
                </div>

                {/* ── Alert Panel ── */}
                <div style={{ overflow: 'hidden' }}>
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

                {/* ── Predictive strip ── */}
                <div>
                    <ErrorBoundary label="Predictive" fallback={<PredictiveSkeleton />}>
                        <PredictiveStrip />
                    </ErrorBoundary>
                </div>

                {/* ── Activity feed ── */}
                <div>
                    <ErrorBoundary label="Activity" fallback={<ActivityFeedSkeleton />}>
                        <ActivityFeed />
                    </ErrorBoundary>
                </div>

                {/* ── Alert detail drawer ── */}
                <AlertDrawer
                    alert={drawerAlert}
                    onClose={closeDrawer}
                    onApprove={handleApprove}
                    onIgnore={handleIgnore}
                    onDispatch={handleDispatch}
                    onEscalate={handleEscalate}
                />

                {/* ── Corridor control drawer ── */}
                <CorridorControlPanel
                    corridor={selectedCorridor}
                    onClose={clearCorridor}
                    onUpdateTiming={handleUpdateTiming}
                    onLock={lockCorridor}
                    onUnlock={unlockCorridor}
                />
            </div>
        </ModeProvider>
    );
}