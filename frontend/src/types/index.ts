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

// ── Operating Mode ─────────────────────────
export type OperatingMode = 'AI-Prioritized' | 'Human-Validated';

export interface ModeThresholds {
    trafficVolume:   number;   // vehicles/hour threshold
    incidentActive:  boolean;
    weatherImpact:   boolean;
    eventActive:     boolean;
    emergencyActive: boolean;
    aiConfidenceMin: number;   // below this → Human-Validated
}

export interface ModeTransition {
    id:          string;
    from:        OperatingMode;
    to:          OperatingMode;
    reason:      string;
    triggeredBy: 'auto' | 'manual';
    triggeredAt: Date;
    operatorId?: string;
}

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

export type AlertStatus =
    | 'active'
    | 'acknowledged'
    | 'resolved'
    | 'ignored'
    | 'escalated'
    | 'expired';

export type AlertPendingAction = 'approve' | 'dispatch' | 'ignore' | 'escalate' | null;

// 1=info(blue) 2=advisory(yellow) 3=elevated(orange) 4=critical(red) 5=emergency(purple)
export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export interface AlertImpact {
    metric: string; // e.g. "Congestion Index"
    value:  number;
    unit:   string; // e.g. "%", "min", "km"
}

export interface AlertTimer {
    expiresAt: Date;
    urgency:   'normal' | 'critical';
}

export interface AlertCluster {
    id:          string;
    label:       string; // "5 intersections in Westlands"
    alertIds:    string[];
    zone:        string;
    severity:    Severity;
    type:        AlertType;
    totalImpact: number;
}

export interface AlertLocation {
    lat:             number;
    lng:             number;
    label:           string;
    zone:            string;
    intersectionId?: string;
    corridorId?:     string;
}

export interface Alert {
    id:            string;
    type:          AlertType;
    severity:      Severity;
    severityLevel?: SeverityLevel; // numeric 1-5 for display
    status:        AlertStatus;
    title:         string;
    description:   string;
    location:      AlertLocation;
    detectedAt:    Date;
    updatedAt:     Date;
    expiresAt?:    Date;           // for auto-aging
    confidence:    number;         // 0–100
    confidenceMetadata?: {
        dataCompleteness:   number; // %
        lastTrainingUpdate: Date;
        modelVersion?:      string;
    };
    impact?:                AlertImpact;
    timer?:                 AlertTimer; // countdown for urgent alerts
    affectedIntersections:  string[];
    affectedAgencies?:      Agency[];   // cross-agency visibility
    suggestedAction?:       string;
    assignedTo?:            string;
    assignedAgency?:        Agency;
    claimedBy?:             Agency;     // agency that locked the alert
    escalatedTo?:           string;     // supervisor id
    escalatedAt?:           Date;
    dismissReason?:         string;     // required for ignored/dismissed
    agency?:                Agency;
    occurrenceCount?:       number;
    isGrouped?:             boolean;
    groupedAlertIds?:       string[];
    clusterId?:             string;     // if part of a cluster
}

// ── AI Recommendations ────────────────────
//
// This is the single source of truth for recommendations — used by both
// the incidents page (ContextualActionBar / RecCard) and the backend API.
//
// Field mapping from the old local AIRecommendation in page.tsx:
//   AIRecommendation.type   → RecommendationType  (was interventionType)
//   AIRecommendation.action → title
//   AIRecommendation.detail → description
//   AIRecommendation.eta    → eta       (new field added here)
//   AIRecommendation.impact → impact    (new field added here)
//
export type RecommendationStatus = 'pending' | 'approved' | 'modified' | 'rejected' | 'in_progress';

// Aligns with page.tsx REC_COLOR / REC_ICON keys
export type RecommendationType = 'route' | 'dispatch' | 'signal' | 'escalate';

export interface Recommendation {
    id:          string;
    type:        RecommendationType; // renamed from interventionType for UI alignment
    title:       string;             // maps to: action label shown in RecCard
    description: string;             // maps to: detail text shown in RecCard
    confidence:  number;             // 0–100
    status:      RecommendationStatus;
    impact:      string;             // e.g. "−22% congestion"
    eta:         string;             // e.g. "2 min to effect"
    affectedCorridors: string[];
    expectedImpact: {
        congestionReduction:      number;  // percentage
        fuelSavingsLiters?:       number;
        travelTimeSavedMinutes?:  number;
    };
    generatedAt:      Date;
    expiresAt:        Date;
    rejectionReason?: string;
    approvedBy?:      string;
    approvedAt?:      Date;
    metadata?: {
        detectionData?: {
            vehicleCount:      number;
            timeWindow:        string; // e.g. "4min"
            averageSpeed?:     number;
            congestionLevel?:  string;
        };
    };
}

// ── Corridors & Signals ───────────────────
export type CorridorStatus = 'normal' | 'congested' | 'blocked' | 'emergency' | 'optimized';

export interface SignalTiming {
    greenSeconds:  number;
    yellowSeconds: number;
    redSeconds:    number;
    adaptive:      boolean;
}

export interface Corridor {
    id:           string;
    name:         string;
    status:       CorridorStatus;
    flowRate:     number; // vehicles/hour
    capacityRate: number; // max vehicles/hour
    avgSpeedKph:  number;
    signalTiming?: SignalTiming;
    cameras:       Camera[];
    intersections: string[];
    lockedBy?:     string; // agency locking this corridor
    lockedAt?:     Date;
}

export interface Camera {
    id:          string;
    corridorId:  string;
    label:       string;
    lat:         number;
    lng:         number;
    status:      'online' | 'offline' | 'degraded';
    lastImageAt?: Date;
    feedUrl?:    string;
}

// ── Predictive / Timeline ─────────────────
export type TimelineSlot = 'now' | '+30' | '+60' | '+120';

export interface PredictiveSnapshot {
    slot:          TimelineSlot;
    hotspots:      { corridorId: string; severity: Severity }[];
    parkingDemand: 'low' | 'moderate' | 'high';
    ptDelayRisk:   'low' | 'moderate' | 'high';
    weatherImpact: 'none' | 'minor' | 'moderate' | 'severe';
    eventImpact?:  string;
}

// ── System Health ─────────────────────────
export interface SystemHealth {
    iotNetworkPercent: number; // % sensors online
    aiConfidence:      number; // 0–100
    uptimePercent:     number;
    activeOperators:   number;
    dataDelaySeconds:  number; // 0 = live
    lastRefreshedAt:   Date;
}

// ── Audit / Actions ───────────────────────
export type ActionType =
    | 'alert_approved'
    | 'alert_rejected'
    | 'alert_ignored'
    | 'alert_escalated'
    | 'alert_dismissed'
    | 'alert_claimed'
    | 'alert_expired'
    | 'signal_adjusted'
    | 'corridor_activated'
    | 'corridor_locked'
    | 'dispatch_sent'
    | 'ai_approved'
    | 'ai_rejected'
    | 'mode_switched'
    | 'mode_override'
    | 'emergency_mode_activated'
    | 'emergency_mode_deactivated';

export interface AuditAction {
    id:           string;
    type:         ActionType;
    performedBy:  string;
    agency:       Agency;
    timestamp:    Date;
    targetId:     string; // alertId, corridorId, recommendationId
    targetLabel:  string;
    details?:     Record<string, unknown>;
    previousState?: Record<string, unknown>;
}

// ── Incident Domain ───────────────────────
//
// Order matters: primitive types first, then structs that depend on them.
//

export type IncidentStatus   = 'detected' | 'confirmed' | 'responding' | 'resolving' | 'cleared';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ResponderStatus  = 'en_route' | 'arrived' | 'pending' | 'dispatched';

export interface Responder {
    id:       string;
    name:     string;
    type:     'police' | 'ambulance' | 'tow' | 'fire';
    status:   ResponderStatus;
    eta:      number | null; // minutes, null if not applicable
    distance: string;        // e.g. "1.1 km"
    badge:    string;        // unit identifier e.g. "NBI-PA-01"
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
    severity:         IncidentSeverity;
    status:           IncidentStatus;
    detectedAt:       Date | string;
    confidence:       number;          // 0–100 AI confidence
    vehiclesAffected: number;
    avgDelay:         number;          // minutes
    congestionIndex:  number;          // 0–100
    clearanceEta:     number;          // minutes
    recommendations:  Recommendation[];
    responders:       Responder[];
    timeline:         TimelineEvent[];
    updatedAt:       Date | string;

}

// ── WebSocket Events ──────────────────────
export type WsEventType =
    | 'alert:new'
    | 'alert:created'
    | 'alert:updated'
    | 'alert:resolved'
    | 'alert:escalated'
    | 'alert:expired'
    | 'recommendation:new'
    | 'corridor:updated'
    | 'action:performed'
    | 'incident:updated'
    | 'responder:updated'
    | 'health:updated'
    | 'mode:changed'
    | 'emergency:activated'
    | 'emergency:deactivated';

export interface WsEvent<T = unknown> {
    type:          WsEventType;
    payload:       T;
    timestamp:     Date | string;
    sourceAgency?: Agency;
}

// ── UI State ──────────────────────────────
export interface MapState {
    center:            { lat: number; lng: number };
    zoom:              number;
    activeOverlays:    MapOverlay[];
    viewMode:          'live' | 'forecast' | 'historical';
    focusedAlertId?:   string;
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



// ── Parking Module Types ─────────────────────────────────────────────

export type ZoneStatus = "critical" | "high" | "moderate" | "low";

export interface Zone {
    id: string;
    name: string;
    location: string;
    capacity: number;
    occupied: number;
    status: ZoneStatus; // computed from occupancy
    currentPrice: number;
    aiPrice: number | null;
    locked: boolean;
    aiDisabled: boolean;
    forecast30: number; // predicted occupancy in 30 min
    forecast60: number;
    forecast120: number;
}

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
    timestamp: string; // ISO string
    status: 'pending' | 'approved' | 'overridden' | 'rejected';
}

export interface ParkingAuditLog {
    id: string;
    operator: string;
    time: string; // ISO string
    zone: string;
    aiSuggestion: string;
    finalAction: string;
    type: 'approved' | 'overridden' | 'rejected';
}