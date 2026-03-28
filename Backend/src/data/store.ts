import { v4 as uuid } from 'uuid';
import type {
    Alert, Incident, Corridor, AuditEntry,
    Recommendation, SystemHealth, Responder, TimelineEvent,
} from '../types/backend-index.js';
import {incidentSeeds} from "./incidents.js";


// ─── Helpers ──────────────────────────────────────────────────────────────────

const ago = (m: number) => new Date(Date.now() - m * 60_000);
const fwd = (m: number) => new Date(Date.now() + m * 60_000);

// ─── Alerts store ─────────────────────────────────────────────────────────────

export const alerts = new Map<string, Alert>([
    ['a1', {
        id: 'a1', title: 'Severe gridlock — CBD Ring Road',
        description: 'Multiple lanes blocked following a multi-vehicle incident. Vehicles queuing back 1.8 km towards Uhuru Highway.',
        type: 'congestion', severity: 'critical', status: 'active',
        confidence: 94, location: { lat: -1.2841, lng: 36.8255, label: 'CBD Ring Road', zone: 'Zone 1' },
        detectedAt: ago(12), updatedAt: ago(2),
        affectedIntersections: ['INT-001', 'INT-002', 'INT-003'],
        impact: { metric: 'Congestion level', value: 94, unit: '%' },
        agency: 'Traffic Ops',
        suggestedAction: 'Redirect northbound traffic via Uhuru Highway. Adjust signal timing on 3 affected junctions.',
    }],
    ['a2', {
        id: 'a2', title: 'Multi-vehicle collision — Thika Road',
        description: 'Three-vehicle accident near exit 5. Two lanes blocked, emergency services en route.',
        type: 'accident', severity: 'critical', status: 'escalated',
        confidence: 98, location: { lat: -1.2195, lng: 36.8869, label: 'Thika Road – Exit 5', zone: 'Zone 7' },
        detectedAt: ago(7), updatedAt: ago(1),
        affectedIntersections: ['INT-077', 'INT-078'],
        impact: { metric: 'Lanes blocked', value: 2, unit: 'lanes' },
        agency: 'Emergency Services',
        suggestedAction: 'Dispatch tow truck and ambulance. Close affected lanes via VMS.',
        timer: { expiresAt: fwd(8), urgency: 'critical' },
    }],
    ['a3', {
        id: 'a3', title: 'Heavy congestion — Uhuru Highway',
        description: 'Traffic building up following CBD Ring Road diversion. Volume 45 min above baseline.',
        type: 'congestion', severity: 'high', status: 'active',
        confidence: 82, location: { lat: -1.3001, lng: 36.8080, label: 'Uhuru Highway Southbound', zone: 'Zone 3' },
        detectedAt: ago(45), updatedAt: ago(5),
        affectedIntersections: ['INT-014', 'INT-015'],
        impact: { metric: 'Delay', value: 45, unit: 'min' },
        agency: 'Traffic Ops',
    }],
    ['a4', {
        id: 'a4', title: 'Signal failure — Westlands roundabout',
        description: 'Traffic signal controller offline due to power outage. Manual traffic control required.',
        type: 'signal_failure', severity: 'high', status: 'active',
        confidence: 99, location: { lat: -1.2669, lng: 36.8102, label: 'Westlands Roundabout', zone: 'Zone 2' },
        detectedAt: ago(23), updatedAt: ago(4),
        affectedIntersections: ['INT-032'],
        impact: { metric: 'Delay', value: 22, unit: 'min' },
        timer: { expiresAt: fwd(15), urgency: 'critical' },
    }],
    ['a5', {
        id: 'a5', title: 'Road flooding — Ngong Road',
        description: 'Surface water accumulation after heavy rain. One lane passable with caution.',
        type: 'flooding', severity: 'medium', status: 'active',
        confidence: 76, location: { lat: -1.3056, lng: 36.7989, label: 'Ngong Road – Adams Arcade', zone: 'Zone 4' },
        detectedAt: ago(35), updatedAt: ago(10),
        affectedIntersections: ['INT-051'],
    }],
]);

// ─── Incidents store ──────────────────────────────────────────────────────────
//
// buildIncident() is called once at startup so all Date values are fresh.
// The Map is exported so route handlers can read and mutate it directly.
//
export const incidents = new Map<string, Incident>(incidentSeeds);


function buildIncident(): Incident {
    // Recommendations use the unified Recommendation type — no more AIRecommendation.
    // type: 'route' | 'dispatch' | 'signal' | 'escalate' drives UI icons/colours.
    const recommendations: Recommendation[] = [
        {
            id:          'r1',
            type:        'route',
            title:       'Redirect via Mbagathi Way',
            description: 'Alternate route reduces queue by 22% over 15 min',
            confidence:  91,
            impact:      '−22% congestion',
            eta:         '2 min to effect',
            status:      'pending',
            affectedCorridors: ['c1'],
            expectedImpact: { congestionReduction: 22, travelTimeSavedMinutes: 15 },
            generatedAt: ago(7),
            expiresAt:   fwd(30),
        },
        {
            id:          'r2',
            type:        'dispatch',
            title:       'Dispatch tow truck KCC-03',
            description: 'Nearest unit 2.4 km away, ETA 8 min',
            confidence:  96,
            impact:      'ETA 8 min',
            eta:         '8 min',
            status:      'approved',
            affectedCorridors: ['c2'],
            expectedImpact: { congestionReduction: 30 },
            generatedAt: ago(7),
            expiresAt:   fwd(15),
        },
        {
            id:          'r3',
            type:        'signal',
            title:       'Adjust signals — 3 junctions',
            description: 'Extend green on Mbagathi, Langata, James Gichuru',
            confidence:  84,
            impact:      '+15% throughput',
            eta:         '1 min to effect',
            status:      'pending',
            affectedCorridors: ['c3', 'c4'],
            expectedImpact: { congestionReduction: 15 },
            generatedAt: ago(7),
            expiresAt:   fwd(20),
        },
    ];

    const responders: Responder[] = [
        { id: 'rsp1', name: 'Police Unit A',    type: 'police',    status: 'en_route',   eta: 3,    distance: '1.1 km', badge: 'NBI-PA-01' },
        { id: 'rsp2', name: 'Ambulance KNH-2',  type: 'ambulance', status: 'arrived',    eta: null, distance: '0 km',   badge: 'KNH-A-02'  },
        { id: 'rsp3', name: 'Tow Truck KCC-03', type: 'tow',       status: 'dispatched', eta: 8,    distance: '2.4 km', badge: 'KCC-T-03'  },
        { id: 'rsp4', name: 'Fire Unit B-1',    type: 'fire',      status: 'pending',    eta: null, distance: '4.2 km', badge: 'NBI-F-B1'  },
    ];

    const timeline: TimelineEvent[] = [
        { id: 't1', time: ago(7),    label: 'AI anomaly detected',      detail: 'Sensor cluster flagged velocity drop >60%',      type: 'ai',       actor: 'ATMS-AI',      completed: true  },
        { id: 't2', time: ago(6),    label: 'Incident confirmed',        detail: 'Camera feed confirmed via operator',             type: 'operator', actor: 'Fatima Nkosi', completed: true  },
        { id: 't3', time: ago(5),    label: 'Responders dispatched',     detail: 'Police Unit A + Ambulance KNH-2 en route',      type: 'system',   actor: 'System',       completed: true  },
        { id: 't4', time: ago(2),    label: 'Ambulance KNH-2 on scene',  detail: 'Medical response active — 2 casualties treated', type: 'responder',actor: 'KNH-A-02',     completed: true  },
        { id: 't5', time: new Date(),label: 'Traffic redirect pending',  detail: 'Awaiting operator approval for Mbagathi route',  type: 'ai',       actor: 'ATMS-AI',      completed: false },
        { id: 't6', time: fwd(8),    label: 'Tow truck arrival',         detail: 'KCC-T-03 ETA 8 min',                            type: 'system',   actor: 'KCC-T-03',     completed: false },
        { id: 't7', time: fwd(22),   label: 'Estimated clearance',       detail: 'AI projection based on responder ETAs',         type: 'ai',       actor: 'ATMS-AI',      completed: false },
    ];

    return {
        id:               'INC-2026-0847',
        name:             'Multi-vehicle collision — Ngong Road',
        location:         'Ngong Road – Adams Arcade Junction',
        zone:             'Zone 4 · Southbound',
        lat:              -1.3056,
        lng:              36.7989,
        severity:         'high',
        status:           'responding',
        detectedAt:       ago(7),
        updatedAt:        ago(1),
        confidence:       87,
        vehiclesAffected: 134,
        avgDelay:         18,
        congestionIndex:  78,
        clearanceEta:     22,
        recommendations,
        responders,
        timeline,
    };
}

// Exported Map — route handlers import and mutate this directly.


// ─── Corridors store ──────────────────────────────────────────────────────────

export const corridors = new Map<string, Corridor>([
    ['c1', { id: 'c1', name: 'Uhuru Highway N–S',     from: 'Museum Hill',    to: 'Nyayo Stadium', distance: 8.2,  flowRate: 1840, status: 'congested', timing: { greenDuration: 45, redDuration: 55, yellowDuration: 4, cycleLength: 104 }, locked: false, updatedAt: ago(3)  }],
    ['c2', { id: 'c2', name: 'Thika Superhighway',    from: 'Pangani',        to: 'Githurai',      distance: 14.5, flowRate: 2100, status: 'moderate',  timing: { greenDuration: 55, redDuration: 45, yellowDuration: 4, cycleLength: 104 }, locked: false, updatedAt: ago(8)  }],
    ['c3', { id: 'c3', name: 'Ngong Road Westbound',  from: 'CBD',            to: 'Karen',         distance: 11.3, flowRate: 960,  status: 'congested', timing: { greenDuration: 35, redDuration: 65, yellowDuration: 4, cycleLength: 104 }, locked: false, updatedAt: ago(2)  }],
    ['c4', { id: 'c4', name: 'Jogoo Road Westbound',  from: 'Eastlands',      to: 'CBD',           distance: 6.8,  flowRate: 750,  status: 'blocked',   timing: { greenDuration: 30, redDuration: 70, yellowDuration: 4, cycleLength: 104 }, locked: true,  lockedBy: 'Traffic Ops', updatedAt: ago(5)  }],
    ['c5', { id: 'c5', name: 'Waiyaki Way Eastbound', from: 'Westlands',      to: 'CBD',           distance: 5.1,  flowRate: 1540, status: 'moderate',  timing: { greenDuration: 50, redDuration: 50, yellowDuration: 4, cycleLength: 104 }, locked: false, updatedAt: ago(12) }],
    ['c6', { id: 'c6', name: 'Mbagathi Way N–S',      from: 'Langata Rd Jct', to: 'South B',       distance: 3.9,  flowRate: 680,  status: 'free',      timing: { greenDuration: 60, redDuration: 40, yellowDuration: 4, cycleLength: 104 }, locked: false, updatedAt: ago(18) }],
]);

// ─── Audit log store ──────────────────────────────────────────────────────────

export const auditLog: AuditEntry[] = [
    { id: uuid(), type: 'alert_approved',  performedBy: 'Fatima Nkosi', agency: 'Traffic Ops',        targetId: 'a3',    targetLabel: 'Heavy congestion — Uhuru Highway',       timestamp: ago(35), details: {} },
    { id: uuid(), type: 'dispatch_sent',   performedBy: 'System',       agency: 'Emergency Services', targetId: 'a2',    targetLabel: 'Multi-vehicle collision',                 timestamp: ago(6),  details: { service: 'ambulance' } },
    { id: uuid(), type: 'signal_adjusted', performedBy: 'System',       agency: 'Traffic Ops',        targetId: 'c1',    targetLabel: 'Uhuru Highway — signal timing updated',   timestamp: ago(4),  details: { delta: '+10s green' } },
    { id: uuid(), type: 'ai_approved',     performedBy: 'Fatima Nkosi', agency: 'Traffic Ops',        targetId: 'rec-1', targetLabel: 'Redirect via Mbagathi',                   timestamp: ago(2),  details: {} },
];

// ─── Standalone recommendations store ────────────────────────────────────────
//
// These are global recommendations (linked to alerts via alertId).
// Incident-specific recommendations live inside each Incident.recommendations[].
//

export const recommendations = new Map<string, Recommendation>([
    ['rec-1', {
        id:          'rec-1',
        type:        'route',
        title:       'Redirect via Mbagathi Way',
        description: 'Reduce CBD Ring Road congestion by 22%',
        confidence:  91,
        impact:      '−22% congestion',
        eta:         '2 min to effect',
        status:      'pending',
        affectedCorridors: ['c1', 'c6'],
        expectedImpact: { congestionReduction: 22, travelTimeSavedMinutes: 12 },
        generatedAt: ago(3),
        expiresAt:   fwd(30),
        alertId:     'a1',
    }],
    ['rec-2', {
        id:          'rec-2',
        type:        'signal',
        title:       'Extend green — 3 junctions',
        description: 'Improve throughput by 15% on Ngong Rd',
        confidence:  84,
        impact:      '+15% throughput',
        eta:         '1 min to effect',
        status:      'pending',
        affectedCorridors: ['c3'],
        expectedImpact: { congestionReduction: 15, fuelSavingsLiters: 4.5 },
        generatedAt: ago(6),
        expiresAt:   fwd(30),
        alertId:     'a5',
    }],
    ['rec-3', {
        id:          'rec-3',
        type:        'dispatch',
        title:       'Deploy tow truck KCC-03',
        description: 'Clear Thika Rd within 8 min',
        confidence:  96,
        impact:      'ETA 8 min',
        eta:         '8 min',
        status:      'approved',
        affectedCorridors: ['c2'],
        expectedImpact: { congestionReduction: 30 },
        generatedAt: ago(7),
        expiresAt:   fwd(15),
        alertId:     'a2',
    }],
]);

// ─── System health store ──────────────────────────────────────────────────────

export const systemHealth: SystemHealth = {
    overall:      'ok',
    sensors:       248,
    activeSensors: 234,
    latencyMs:     42,
    uptime:        99.4,
    metrics: [
        { name: 'API latency',       value: 42,   unit: 'ms', status: 'ok'      },
        { name: 'Sensor coverage',   value: 94.4, unit: '%',  status: 'ok'      },
        { name: 'WebSocket clients', value: 3,    unit: '',   status: 'ok'      },
        { name: 'Alert queue depth', value: 5,    unit: '',   status: 'warning' },
        { name: 'AI model latency',  value: 128,  unit: 'ms', status: 'ok'      },
    ],
    updatedAt: new Date(),
};

// ─── Predictive data ──────────────────────────────────────────────────────────

export const predictiveData = {
    hotspots: [
        { id: 'h1', location: 'CBD Ring Road',  eta: 0,  severity: 'critical', confidence: 94 },
        { id: 'h2', location: 'Uhuru Highway',  eta: 15, severity: 'high',     confidence: 81 },
        { id: 'h3', location: 'Ngong Road',     eta: 30, severity: 'medium',   confidence: 73 },
        { id: 'h4', location: 'Jogoo Road',     eta: 45, severity: 'low',      confidence: 67 },
        { id: 'h5', location: 'Mombasa Road',   eta: 60, severity: 'medium',   confidence: 58 },
    ],
    peakHours: [
        { hour: 7,  label: 'Morning peak', volumePct: 91, incidents: 12 },
        { hour: 12, label: 'Midday surge', volumePct: 74, incidents: 5  },
        { hour: 17, label: 'Evening peak', volumePct: 95, incidents: 21 },
        { hour: 22, label: 'Night window', volumePct: 42, incidents: 8  },
    ],
    congestionForecast: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        volumePct: [12,9,7,6,8,18,42,78,91,85,74,70,75,72,68,65,72,88,95,82,60,42,28,16][h],
    })),
};