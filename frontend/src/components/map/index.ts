// ─────────────────────────────────────────
// COMMAND CENTER — TYPE DEFINITIONS
// ─────────────────────────────────────────

// ── Roles & Auth ──────────────────────────
export type Agency = 'traffic' | 'emergency' | 'transport' | 'planning';

export type UserRole =
    | 'traffic_operator'
    | 'emergency_coordinator'
    | 'transport_manager'
    | 'planning_analyst'
    | 'supervisor';

export interface User {
    id: string;
    name: string;
    initials: string;
    role: UserRole;
    agency: Agency;
    shiftStart: Date;
    permissions: Permission[];
}

export type Permission =
    | 'approve_signal'
    | 'activate_corridor'
    | 'dispatch_unit'
    | 'override_emergency'
    | 'view_planning'
    | 'manage_transport';

// ── Severity & Status ─────────────────────
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type SystemStatus = 'online' | 'degraded' | 'offline';

// ── Alerts ────────────────────────────────
export type AlertType =
    | 'congestion'
    | 'incident'
    | 'signal_failure'
    | 'emergency'
    | 'weather'
    | 'event'
    | 'sensor_offline'
    | 'camera_offline';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'ignored';
export type AlertPendingAction = 'approve' | 'dispatch' | 'ignore' | null;

export interface AlertLocation {
    lat: number;
    lng: number;
    label: string;
    zone: string;
    intersectionId?: string;
    corridorId?: string;
}

export interface Alert {
    id: string;
    type: AlertType;
    severity: Severity;
    status: AlertStatus;
    title: string;
    description: string;
    location: AlertLocation;
    detectedAt: Date;
    updatedAt: Date;
    confidence: number; // 0–100
    affectedIntersections: string[];
    suggestedAction?: string;
    assignedTo?: string;
    agency?: Agency;
    occurrenceCount?: number; // for merged alerts
    isGrouped?: boolean;
    groupedAlertIds?: string[];
}

// ── AI Recommendations ────────────────────
export type RecommendationStatus = 'pending' | 'approved' | 'modified' | 'rejected';

export interface Recommendation {
    id: string;
    title: string;
    description: string;
    confidence: number; // 0–100
    status: RecommendationStatus;
    interventionType: 'signal_timing' | 'corridor_activation' | 'dispatch' | 'reroute';
    affectedCorridors: string[];
    expectedImpact: {
        congestionReduction: number; // percentage
        fuelSavingsLiters?: number;
        travelTimeSavedMinutes?: number;
    };
    generatedAt: Date;
    expiresAt: Date;
    rejectionReason?: string;
    approvedBy?: string;
    approvedAt?: Date;
}

// ── Corridors & Signals ───────────────────
export type CorridorStatus = 'normal' | 'congested' | 'blocked' | 'emergency' | 'optimized';

export interface SignalTiming {
    greenSeconds: number;
    yellowSeconds: number;
    redSeconds: number;
    adaptive: boolean;
}

export interface Corridor {
    id: string;
    name: string;
    status: CorridorStatus;
    flowRate: number; // vehicles/hour
    capacityRate: number; // max vehicles/hour
    avgSpeedKph: number;
    signalTiming?: SignalTiming;
    cameras: Camera[];
    intersections: string[];
    lockedBy?: string; // agency locking this corridor
    lockedAt?: Date;
}

export interface Camera {
    id: string;
    corridorId: string;
    label: string;
    lat: number;
    lng: number;
    status: 'online' | 'offline' | 'degraded';
    lastImageAt?: Date;
    feedUrl?: string;
}

// ── Predictive / Timeline ─────────────────
export type TimelineSlot = 'now' | '+30' | '+60' | '+120';

export interface PredictiveSnapshot {
    slot: TimelineSlot;
    hotspots: { corridorId: string; severity: Severity; }[];
    parkingDemand: 'low' | 'moderate' | 'high';
    ptDelayRisk: 'low' | 'moderate' | 'high';
    weatherImpact: 'none' | 'minor' | 'moderate' | 'severe';
    eventImpact?: string;
}

// ── System Health ─────────────────────────
export interface SystemHealth {
    iotNetworkPercent: number;    // % sensors online
    aiConfidence: number;         // 0–100
    uptimePercent: number;
    activeOperators: number;
    dataDelaySeconds: number;     // 0 = live
    lastRefreshedAt: Date;
}

// ── Audit / Actions ───────────────────────
export type ActionType =
    | 'alert_approved'
    | 'alert_rejected'
    | 'alert_ignored'
    | 'signal_adjusted'
    | 'corridor_activated'
    | 'corridor_locked'
    | 'dispatch_sent'
    | 'ai_approved'
    | 'ai_rejected'
    | 'emergency_mode_activated'
    | 'emergency_mode_deactivated';

export interface AuditAction {
    id: string;
    type: ActionType;
    performedBy: string;
    agency: Agency;
    timestamp: Date;
    targetId: string; // alertId, corridorId, recommendationId
    targetLabel: string;
    details?: Record<string, unknown>;
    previousState?: Record<string, unknown>;
}

// ── WebSocket Events ──────────────────────
export type WsEventType =
    | 'alert:new'
    | 'alert:updated'
    | 'alert:resolved'
    | 'recommendation:new'
    | 'corridor:updated'
    | 'action:performed'
    | 'health:updated'
    | 'emergency:activated'
    | 'emergency:deactivated';

export interface WsEvent<T = unknown> {
    type: WsEventType;
    payload: T;
    timestamp: Date;
    sourceAgency?: Agency;
}

// ── UI State ──────────────────────────────
export interface MapState {
    center: { lat: number; lng: number };
    zoom: number;
    activeOverlays: MapOverlay[];
    viewMode: 'live' | 'forecast' | 'historical';
    focusedAlertId?: string;
    focusedCorridorId?: string;
}

export type MapOverlay =
    | 'heatmap'
    | 'cameras'
    | 'signals'
    | 'parking'
    | 'transport'
    | 'weather'
    | 'events'
    | 'incidents'
    | 'predictions';