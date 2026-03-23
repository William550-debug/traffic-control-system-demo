// ─── Shared types — must match frontend types/index.ts ───────────────────────

export type Severity  = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertType =
    | 'accident' | 'congestion' | 'roadwork' | 'event'
    | 'signal_failure' | 'flooding' | 'breakdown' | 'other';

export type AlertStatus = 'active' | 'acknowledged' | 'escalated' | 'ignored' | 'resolved';

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

export interface ConfidenceMetadata {
    [key: string]: string | number | boolean;
}

export interface Alert {
    id:                  string;
    title:               string;
    description:         string;
    type:                AlertType;
    severity:            Severity;
    status:              AlertStatus;
    confidence:          number;
    confidenceMetadata?: ConfidenceMetadata;
    location:            AlertLocation;
    detectedAt:          Date;
    updatedAt:           Date;
    affectedIntersections: string[];
    impact?:             AlertImpact;
    timer?:              AlertTimer;
    agency?:             string;
    suggestedAction?:    string;
    claimedBy?:          string;
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus   = 'detected' | 'confirmed' | 'responding' | 'resolving' | 'cleared';
export type ResponderType    = 'police' | 'ambulance' | 'tow' | 'fire';
export type ResponderStatus  = 'en_route' | 'arrived' | 'pending' | 'dispatched';

export interface AIRecommendation {
    id:         string;
    type:       'route' | 'dispatch' | 'signal' | 'escalate';
    action:     string;
    detail:     string;
    confidence: number;
    impact:     string;
    eta:        string;
    status:     'pending' | 'approved' | 'rejected' | 'in_progress';
}

export interface Responder {
    id:       string;
    name:     string;
    type:     ResponderType;
    status:   ResponderStatus;
    eta:      number | null;
    distance: string;
    badge:    string;
    lat?:     number;
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
    recommendations:  AIRecommendation[];
    responders:       Responder[];
    timeline:         TimelineEvent[];
}

// ─── Corridors ────────────────────────────────────────────────────────────────

export interface SignalTiming {
    greenDuration:  number;
    redDuration:    number;
    yellowDuration: number;
    cycleLength:    number;
}

export interface Corridor {
    id:          string;
    name:        string;
    from:        string;
    to:          string;
    distance:    number;
    flowRate:    number;
    status:      'free' | 'moderate' | 'congested' | 'blocked';
    timing:      SignalTiming;
    locked:      boolean;
    lockedBy?:   string;
    updatedAt:   Date;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export type AuditActionType =
    | 'alert_approved' | 'alert_ignored' | 'alert_escalated'
    | 'dispatch_sent'  | 'signal_adjusted' | 'ai_approved' | 'ai_rejected'
    | 'emergency_mode_activated' | 'emergency_mode_deactivated'
    | 'incident_confirmed' | 'incident_resolved' | 'responder_dispatched'
    | 'traffic_rerouted' | 'recommendation_approved' | 'recommendation_rejected';

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

// ─── AI Recommendations ───────────────────────────────────────────────────────

export interface Recommendation {
    id:         string;
    title:      string;
    description:string;
    confidence: number;
    impact:     string;
    type:       'route' | 'signal' | 'dispatch' | 'other';
    status:     'pending' | 'approved' | 'rejected';
    createdAt:  Date;
    alertId?:   string;
}

// ─── System Health ────────────────────────────────────────────────────────────

export interface SystemHealthMetric {
    name:   string;
    value:  number;
    unit:   string;
    status: 'ok' | 'warning' | 'critical';
}

export interface SystemHealth {
    overall:     'ok' | 'degraded' | 'critical';
    sensors:     number;
    activeSensors: number;
    latencyMs:   number;
    uptime:      number;
    metrics:     SystemHealthMetric[];
    updatedAt:   Date;
}

// ─── WebSocket events ─────────────────────────────────────────────────────────

export type WsEventType =
    | 'alert:created' | 'alert:updated' | 'alert:resolved'
    | 'incident:created' | 'incident:updated'
    | 'responder:updated' | 'health:updated'
    | 'recommendation:new' | 'ping' | 'pong';

export interface WsEvent<T = unknown> {
    type:      WsEventType;
    payload:   T;
    timestamp: string;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

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