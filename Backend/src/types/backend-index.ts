// ─────────────────────────────────────────────────────────────────────────────
// BACKEND — SHARED TYPE DEFINITIONS
// Must stay in sync with frontend types/index.ts
// ─────────────────────────────────────────────────────────────────────────────

// ── Roles & Auth ──────────────────────────────────────────────────────────────

export type UserRole =
    | 'traffic_operator'
    | 'emergency_coordinator'
    | 'supervisor'
    | 'transport_manager'
    | 'planning_analyst';

export type Agency     = 'traffic' | 'emergency' | 'transport' | 'planning';
export type Permission =
    | 'approve_signal'
    | 'activate_corridor'
    | 'dispatch_unit'
    | 'override_emergency'
    | 'view_planning'
    | 'manage_transport';

export interface User {
    id:          string;
    name:        string;
    initials:    string;
    role:        UserRole;
    agency:      Agency;
    shiftStart:  Date;
    permissions: Permission[];
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// NOTE: 'accident' | 'flooding' | 'breakdown' are backend-only alert types.
// The frontend AlertType union is narrower — keep both in sync if you add types.
export type AlertType =
    | 'accident'
    | 'congestion'
    | 'roadwork'
    | 'event'
    | 'signal_failure'
    | 'flooding'
    | 'breakdown'
    | 'other';

export type AlertStatus =
    | 'active'
    | 'acknowledged'
    | 'escalated'
    | 'ignored'
    | 'resolved';

export interface AlertLocation {
    lat:   number;
    lng:   number;
    label: string;
    zone?: string;
}

export interface AlertImpact {
    metric: string;
    value:  number;
    unit:   string;
}

export interface AlertTimer {
    expiresAt: Date;
    urgency:   'normal' | 'critical';
}

export interface Alert {
    id:                    string;
    title:                 string;
    description:           string;
    type:                  AlertType;
    severity:              Severity;
    status:                AlertStatus;
    confidence:            number;
    confidenceMetadata?:   Record<string, string | number | boolean>;
    location:              AlertLocation;
    detectedAt:            Date;
    updatedAt:             Date;
    affectedIntersections: string[];
    impact?:               AlertImpact;
    timer?:                AlertTimer;
    agency?:               string;
    suggestedAction?:      string;
    claimedBy?:            string;
}

// ── Incident Domain ───────────────────────────────────────────────────────────
//
// Order: primitive types → structs that depend on them → Incident last.
//

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus   = 'detected' | 'confirmed' | 'responding' | 'resolving' | 'cleared';
export type ResponderType    = 'police' | 'ambulance' | 'tow' | 'fire';
export type ResponderStatus  = 'en_route' | 'arrived' | 'pending' | 'dispatched';

export interface Responder {
    id:       string;
    name:     string;
    type:     ResponderType;
    status:   ResponderStatus;
    eta:      number | null; // minutes; null when not applicable (e.g. arrived)
    distance: string;        // display string e.g. "1.1 km"
    badge:    string;        // unit ID e.g. "NBI-PA-01"
    lat?:     number;        // live position (optional, updated via WS)
    lng?:     number;
}

export interface TimelineEvent {
    id:        string;
    time:      Date;
    label:     string;
    detail?:   string;
    type:      'ai' | 'operator' | 'system' | 'responder';
    actor?:    string;
    completed: boolean;
}

// ── AI Recommendations ────────────────────────────────────────────────────────
//
// Single source of truth — used by both Incident.recommendations and the
// standalone /api/recommendations store.
//
// Field alignment with frontend RecCard / ContextualActionBar:
//   type        → drives REC_COLOR and REC_ICON in page.tsx
//   title       → action label displayed in RecCard (was 'action' in old AIRecommendation)
//   description → detail text in RecCard           (was 'detail' in old AIRecommendation)
//   impact      → e.g. "−22% congestion"
//   eta         → e.g. "2 min to effect"
//
export type RecommendationStatus =
    | 'pending'
    | 'approved'
    | 'modified'
    | 'rejected'
    | 'in_progress';

// Aligns with frontend REC_ICON / REC_COLOR keys in page.tsx
export type RecommendationType = 'route' | 'dispatch' | 'signal' | 'escalate';

export interface Recommendation {
    id:          string;
    type:        RecommendationType;  // UI-facing type (route/dispatch/signal/escalate)
    title:       string;              // short action label shown in UI
    description: string;              // detail text shown below title
    confidence:  number;              // 0–100
    status:      RecommendationStatus;
    impact:      string;              // e.g. "−22% congestion"
    eta:         string;              // e.g. "2 min to effect"
    affectedCorridors: string[];
    expectedImpact: {
        congestionReduction:     number;
        fuelSavingsLiters?:      number;
        travelTimeSavedMinutes?: number;
    };
    generatedAt:      Date;
    expiresAt:        Date;
    alertId?:         string;         // links recommendation to an alert
    rejectionReason?: string;
    approvedBy?:      string;
    approvedAt?:      Date;
    metadata?: {
        detectionData?: {
            vehicleCount:     number;
            timeWindow:       string;
            averageSpeed?:    number;
            congestionLevel?: string;
        };
    };

}

export interface Incident {
    id:               string;
    name:             string;
    location:         string;
    zone:             string;
    lat:              number;
    lng:              number;
    severity:         IncidentSeverity;
    status:           IncidentStatus;
    detectedAt:       Date;
    updatedAt:        Date;
    confidence:       number;
    vehiclesAffected: number;
    avgDelay:         number;
    congestionIndex:  number;
    clearanceEta:     number;
    recommendations:  Recommendation[]; // ← no more AIRecommendation
    responders:       Responder[];
    timeline:         TimelineEvent[];
}

// ── Corridors ─────────────────────────────────────────────────────────────────

export interface SignalTiming {
    greenDuration:  number;
    redDuration:    number;
    yellowDuration: number;
    cycleLength:    number;
}

export interface Corridor {
    id:        string;
    name:      string;
    from:      string;
    to:        string;
    distance:  number;
    flowRate:  number;
    status:    'free' | 'moderate' | 'congested' | 'blocked';
    timing:    SignalTiming;
    locked:    boolean;
    lockedBy?: string;
    updatedAt: Date;
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export type AuditActionType =
    | 'alert_approved'
    | 'alert_ignored'
    | 'alert_escalated'
    | 'dispatch_sent'
    | 'signal_adjusted'
    | 'ai_approved'
    | 'ai_rejected'
    | 'emergency_mode_activated'
    | 'emergency_mode_deactivated'
    | 'incident_confirmed'
    | 'incident_resolved'
    | 'responder_dispatched'
    | 'traffic_rerouted'
    | 'recommendation_approved'
    | 'recommendation_rejected';

export interface AuditEntry {
    id:          string;
    type:        AuditActionType;
    performedBy: string;
    agency:      string;
    targetId:    string;
    targetLabel: string;
    timestamp:   Date;
    details?:    Record<string, unknown>;
}

// ── System Health ─────────────────────────────────────────────────────────────

export interface SystemHealthMetric {
    name:   string;
    value:  number;
    unit:   string;
    status: 'ok' | 'warning' | 'critical';
}

export interface SystemHealth {
    overall:       'ok' | 'degraded' | 'critical';
    sensors:       number;
    activeSensors: number;
    latencyMs:     number;
    uptime:        number;
    metrics:       SystemHealthMetric[];
    updatedAt:     Date;
}

// ── WebSocket Events ──────────────────────────────────────────────────────────

export type WsEventType =
    | 'alert:created'
    | 'alert:updated'
    | 'alert:resolved'
    | 'alert:new'           // alias re-emitted by frontend provider
    | 'alert:escalated'
    | 'alert:expired'
    | 'incident:created'
    | 'incident:updated'
    | 'responder:updated'
    | 'health:updated'
    | 'corridor:updated'
    | 'recommendation:new'
    | 'action:performed'
    | 'mode:changed'
    | 'ping'
    | 'pong';

export interface WsEvent<T = unknown> {
    type:      WsEventType;
    payload:   T;
    timestamp: string; // always ISO string from backend; frontend accepts Date | string
}

// ── HTTP Helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
    ok:   boolean;
    data: T;
}

export interface ApiError {
    ok:      false;
    error:   string;
    code?:   string;
    details?: unknown;
}

export interface PaginatedResponse<T> {
    ok:    boolean;
    data:  T[];
    total: number;
    page:  number;
    limit: number;
}


// ── Parking Module Types ──────────────────────────────────────────────────────

export type ZoneStatus = "critical" | "high" | "moderate" | "low";

export interface Zone {
    id: string;
    name: string;
    location: string;
    capacity: number;
    occupied: number;
    status: ZoneStatus;               // computed from occupancy
    currentPrice: number;
    aiPrice: number | null;
    locked: boolean;
    aiDisabled: boolean;
    forecast30: number;               // predicted occupancy in 30 min
    forecast60: number;
    forecast120: number;
}

// Parking‑specific recommendation type (different from the incident Recommendation)
export type ParkingRecommendationType =
    | 'price_increase'
    | 'price_decrease'
    | 'redirect'
    | 'alert';

export interface ParkingRecommendation {
    id: string;
    zoneId: string;
    zoneName: string;
    action: string;
    reason: string;
    confidence: number;
    impact: string;
    type: ParkingRecommendationType;
    timestamp: string;                // ISO string
    status: 'pending' | 'approved' | 'overridden' | 'rejected';
}

export interface ParkingAuditLog {
    id: string;
    operator: string;
    time: string;                     // ISO string
    zone: string;
    aiSuggestion: string;
    finalAction: string;
    type: 'approved' | 'overridden' | 'rejected';

}
