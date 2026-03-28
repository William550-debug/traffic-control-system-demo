// data/incidents.ts
// ─────────────────────────────────────────────────────────────────────────────
// Mock incident seed data.
// Imported once by store.ts to populate the in-memory Map at startup.
// Add / remove entries here to adjust the seeded dataset — do NOT import this
// file anywhere else; always consume incidents via store.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuid } from 'uuid';
import type {
    Incident,
    Recommendation,
    Responder,
    TimelineEvent,
} from '../types/backend-index.js';

// ─── Time helpers (module-scoped so all dates are consistent at seed time) ───

const ago = (m: number) => new Date(Date.now() - m * 60_000);
const fwd = (m: number) => new Date(Date.now() + m * 60_000);

// ─── Factory helpers ──────────────────────────────────────────────────────────

/** Stamp a fresh uuid + time onto a raw TimelineEvent seed. */
const makeEvent = (
    seed: Omit<TimelineEvent, 'id' | 'time'> & { minutesAgo: number }
): TimelineEvent => ({
    id:        uuid(),
    time:      ago(seed.minutesAgo),
    label:     seed.label,
    detail:    seed.detail,
    type:      seed.type,
    actor:     seed.actor,
    completed: seed.completed,
});

// ─────────────────────────────────────────────────────────────────────────────
// INC-2026-0847 — Multi-vehicle collision, Ngong Road (HIGH / responding)
// ─────────────────────────────────────────────────────────────────────────────

const inc_0847 = (): Incident => {
    const recommendations: Recommendation[] = [
        {
            id: 'r1', type: 'route',
            title: 'Redirect via Mbagathi Way',
            description: 'Alternate route reduces queue by 22 % over 15 min',
            confidence: 91, impact: '−22% congestion', eta: '2 min to effect',
            status: 'pending',
            affectedCorridors: ['c1'],
            expectedImpact: { congestionReduction: 22, travelTimeSavedMinutes: 15 },
            generatedAt: ago(7), expiresAt: fwd(30),
        },
        {
            id: 'r2', type: 'dispatch',
            title: 'Dispatch tow truck KCC-03',
            description: 'Nearest unit 2.4 km away, ETA 8 min',
            confidence: 96, impact: 'ETA 8 min', eta: '8 min',
            status: 'approved',
            affectedCorridors: ['c2'],
            expectedImpact: { congestionReduction: 30 },
            generatedAt: ago(7), expiresAt: fwd(15),
        },
        {
            id: 'r3', type: 'signal',
            title: 'Adjust signals — 3 junctions',
            description: 'Extend green on Mbagathi, Langata, James Gichuru',
            confidence: 84, impact: '+15% throughput', eta: '1 min to effect',
            status: 'pending',
            affectedCorridors: ['c3', 'c4'],
            expectedImpact: { congestionReduction: 15 },
            generatedAt: ago(7), expiresAt: fwd(20),
        },
    ];

    const responders: Responder[] = [
        { id: 'rsp1', name: 'Police Unit A',    type: 'police',    status: 'en_route',   eta: 3,    distance: '1.1 km', badge: 'NBI-PA-01' },
        { id: 'rsp2', name: 'Ambulance KNH-2',  type: 'ambulance', status: 'arrived',    eta: null, distance: '0 km',   badge: 'KNH-A-02'  },
        { id: 'rsp3', name: 'Tow Truck KCC-03', type: 'tow',       status: 'dispatched', eta: 8,    distance: '2.4 km', badge: 'KCC-T-03'  },
        { id: 'rsp4', name: 'Fire Unit B-1',    type: 'fire',      status: 'pending',    eta: null, distance: '4.2 km', badge: 'NBI-F-B1'  },
    ];

    const timeline: TimelineEvent[] = [
        makeEvent({ minutesAgo: 7,  label: 'AI anomaly detected',     detail: 'Sensor cluster flagged velocity drop >60%',       type: 'ai',       actor: 'ATMS-AI',      completed: true  }),
        makeEvent({ minutesAgo: 6,  label: 'Incident confirmed',       detail: 'Camera feed confirmed via operator',              type: 'operator', actor: 'Fatima Nkosi', completed: true  }),
        makeEvent({ minutesAgo: 5,  label: 'Responders dispatched',    detail: 'Police Unit A + Ambulance KNH-2 en route',       type: 'system',   actor: 'System',       completed: true  }),
        makeEvent({ minutesAgo: 2,  label: 'Ambulance KNH-2 on scene', detail: 'Medical response active — 2 casualties treated', type: 'responder',actor: 'KNH-A-02',     completed: true  }),
        makeEvent({ minutesAgo: 0,  label: 'Traffic redirect pending',  detail: 'Awaiting operator approval for Mbagathi route', type: 'ai',       actor: 'ATMS-AI',      completed: false }),
        // future events share the same shape — just set completed: false
        { id: uuid(), time: fwd(8),  label: 'Tow truck arrival',    detail: 'KCC-T-03 ETA 8 min',                    type: 'system', actor: 'KCC-T-03', completed: false },
        { id: uuid(), time: fwd(22), label: 'Estimated clearance',  detail: 'AI projection based on responder ETAs', type: 'ai',     actor: 'ATMS-AI',  completed: false },
    ];

    return {
        id: 'INC-2026-0847',
        name: 'Multi-vehicle collision — Ngong Road',
        location: 'Ngong Road – Adams Arcade Junction',
        zone: 'Zone 4 · Southbound',
        lat: -1.3056, lng: 36.7989,
        severity: 'high', status: 'responding',
        detectedAt: ago(7), updatedAt: ago(1),
        confidence: 87,
        vehiclesAffected: 134, avgDelay: 18,
        congestionIndex: 78, clearanceEta: 22,
        recommendations, responders, timeline,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// INC-2026-0848 — Severe gridlock, CBD Ring Road (CRITICAL / confirmed)
// ─────────────────────────────────────────────────────────────────────────────

const inc_0848 = (): Incident => {
    const recommendations: Recommendation[] = [
        {
            id: 'r4', type: 'signal',
            title: 'Activate green-wave on Kenyatta Ave',
            description: 'Coordinate 6 signals to flush CBD queue northward',
            confidence: 88, impact: '−18% queue length', eta: '3 min to effect',
            status: 'pending',
            affectedCorridors: ['c1'],
            expectedImpact: { congestionReduction: 18, travelTimeSavedMinutes: 10 },
            generatedAt: ago(10), expiresAt: fwd(25),
        },
        {
            id: 'r5', type: 'escalate',
            title: 'Escalate to Traffic Supervisor',
            description: 'Incident exceeds tier-1 threshold; supervisor review required',
            confidence: 99, impact: 'Faster decision', eta: 'Immediate',
            status: 'pending',
            affectedCorridors: [],
            expectedImpact: { congestionReduction: 0 },
            generatedAt: ago(10), expiresAt: fwd(5),
        },
    ];

    const responders: Responder[] = [
        { id: 'rsp5', name: 'Traffic Warden TW-12', type: 'police', status: 'arrived',  eta: null, distance: '0 km',   badge: 'NBI-TW-12' },
        { id: 'rsp6', name: 'Police Patrol PP-07',  type: 'police', status: 'en_route', eta: 6,    distance: '2.1 km', badge: 'NBI-PP-07' },
    ];

    const timeline: TimelineEvent[] = [
        makeEvent({ minutesAgo: 14, label: 'Gridlock pattern detected', detail: 'AI model flagged intersection deadlock at 3 nodes', type: 'ai',       actor: 'ATMS-AI',       completed: true  }),
        makeEvent({ minutesAgo: 12, label: 'Incident confirmed',         detail: 'CCTV review confirmed — CBD Ring Road blocked',    type: 'operator', actor: 'James Otieno',  completed: true  }),
        makeEvent({ minutesAgo: 10, label: 'Traffic warden deployed',    detail: 'TW-12 on scene managing flow manually',            type: 'system',   actor: 'System',        completed: true  }),
        makeEvent({ minutesAgo: 0,  label: 'Signal optimisation pending',detail: 'Green-wave recommendation awaiting approval',      type: 'ai',       actor: 'ATMS-AI',       completed: false }),
        { id: uuid(), time: fwd(10), label: 'Supervisor review',     detail: 'Escalation window closes in 10 min', type: 'system', actor: 'System', completed: false },
    ];

    return {
        id: 'INC-2026-0848',
        name: 'Severe gridlock — CBD Ring Road',
        location: 'CBD Ring Road – Haile Selassie Ave',
        zone: 'Zone 1 · CBD',
        lat: -1.2841, lng: 36.8255,
        severity: 'critical', status: 'confirmed',
        detectedAt: ago(14), updatedAt: ago(2),
        confidence: 94,
        vehiclesAffected: 280, avgDelay: 35,
        congestionIndex: 94, clearanceEta: 45,
        recommendations, responders, timeline,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// INC-2026-0849 — Signal failure, Westlands Roundabout (HIGH / detected)
// ─────────────────────────────────────────────────────────────────────────────

const inc_0849 = (): Incident => {
    const recommendations: Recommendation[] = [
        {
            id: 'r6', type: 'dispatch',
            title: 'Dispatch maintenance crew MC-04',
            description: 'Signal controller offline — hardware reset required on-site',
            confidence: 97, impact: 'Restore signals in ~20 min', eta: '20 min',
            status: 'pending',
            affectedCorridors: ['c5'],
            expectedImpact: { congestionReduction: 40 },
            generatedAt: ago(5), expiresAt: fwd(30),
        },
        {
            id: 'r7', type: 'route',
            title: 'Divert via Peponi Road',
            description: 'Reduce westlands intersection load while signals are down',
            confidence: 76, impact: '−15% local volume', eta: '4 min to effect',
            status: 'pending',
            affectedCorridors: ['c5'],
            expectedImpact: { congestionReduction: 15, travelTimeSavedMinutes: 8 },
            generatedAt: ago(5), expiresAt: fwd(20),
        },
    ];

    const responders: Responder[] = [
        { id: 'rsp7', name: 'Maintenance Crew MC-04', type: 'tow', status: 'pending', eta: null, distance: '5.3 km', badge: 'NBI-MC-04' },
    ];

    const timeline: TimelineEvent[] = [
        makeEvent({ minutesAgo: 23, label: 'Signal offline alert',     detail: 'Controller INT-032 stopped heartbeat',          type: 'ai',     actor: 'ATMS-AI', completed: true  }),
        makeEvent({ minutesAgo: 20, label: 'Power outage confirmed',   detail: 'KPLC grid fault on Waiyaki Way feeder',         type: 'system', actor: 'System',   completed: true  }),
        makeEvent({ minutesAgo: 0,  label: 'Manual control activated', detail: 'Warden TW-09 requested — not yet on site',     type: 'ai',     actor: 'ATMS-AI', completed: false }),
        { id: uuid(), time: fwd(15), label: 'Maintenance crew ETA', detail: 'MC-04 dispatched pending approval', type: 'system', actor: 'System', completed: false },
    ];

    return {
        id: 'INC-2026-0849',
        name: 'Signal failure — Westlands Roundabout',
        location: 'Westlands Roundabout – Waiyaki Way',
        zone: 'Zone 2 · Westlands',
        lat: -1.2669, lng: 36.8102,
        severity: 'high', status: 'detected',
        detectedAt: ago(23), updatedAt: ago(4),
        confidence: 99,
        vehiclesAffected: 89, avgDelay: 22,
        congestionIndex: 61, clearanceEta: 30,
        recommendations, responders, timeline,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// INC-2026-0850 — Road flooding, Thika Road (MEDIUM / resolving)
// ─────────────────────────────────────────────────────────────────────────────

const inc_0850 = (): Incident => {
    const recommendations: Recommendation[] = [
        {
            id: 'r8', type: 'signal',
            title: 'Reduce inflow — Exit 5 slip road',
            description: 'Lower signal phase to meter vehicles entering flooded section',
            confidence: 80, impact: '−10% local volume', eta: '2 min to effect',
            status: 'approved',
            affectedCorridors: ['c2'],
            expectedImpact: { congestionReduction: 10 },
            generatedAt: ago(20), expiresAt: fwd(10),
        },
    ];

    const responders: Responder[] = [
        { id: 'rsp8', name: 'Drainage Unit DR-02', type: 'tow',   status: 'arrived',  eta: null, distance: '0 km',   badge: 'NBI-DR-02' },
        { id: 'rsp9', name: 'Police Patrol PP-11', type: 'police', status: 'arrived',  eta: null, distance: '0 km',   badge: 'NBI-PP-11' },
    ];

    const timeline: TimelineEvent[] = [
        makeEvent({ minutesAgo: 40, label: 'Flooding detected',          detail: 'Rain gauge + speed sensor anomaly on Exit 5',    type: 'ai',       actor: 'ATMS-AI',      completed: true }),
        makeEvent({ minutesAgo: 35, label: 'Incident confirmed',          detail: 'Operator confirmed via highway camera feed',     type: 'operator', actor: 'Amina Waweru', completed: true }),
        makeEvent({ minutesAgo: 30, label: 'Drainage unit dispatched',    detail: 'DR-02 en route with water pumping equipment',   type: 'system',   actor: 'System',       completed: true }),
        makeEvent({ minutesAgo: 15, label: 'Drainage unit on scene',      detail: 'Pumping in progress — water level dropping',    type: 'responder',actor: 'NBI-DR-02',    completed: true }),
        makeEvent({ minutesAgo: 5,  label: 'One lane reopened',           detail: 'Slow traffic through — caution signs in place', type: 'system',   actor: 'System',       completed: true }),
        { id: uuid(), time: fwd(20), label: 'Full clearance expected', detail: 'AI projection — water below critical level', type: 'ai', actor: 'ATMS-AI', completed: false },
    ];

    return {
        id: 'INC-2026-0850',
        name: 'Road flooding — Thika Road Exit 5',
        location: 'Thika Superhighway – Exit 5 Slip Road',
        zone: 'Zone 7 · Northbound',
        lat: -1.2195, lng: 36.8869,
        severity: 'medium', status: 'resolving',
        detectedAt: ago(40), updatedAt: ago(5),
        confidence: 76,
        vehiclesAffected: 62, avgDelay: 12,
        congestionIndex: 38, clearanceEta: 20,
        recommendations, responders, timeline,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// INC-2026-0851 — Roadwork, Uhuru Highway (LOW / cleared)
// ─────────────────────────────────────────────────────────────────────────────

const inc_0851 = (): Incident => {
    const recommendations: Recommendation[] = [];   // all resolved; no pending actions

    const responders: Responder[] = [
        { id: 'rsp10', name: 'Road Works RW-01', type: 'tow', status: 'arrived', eta: null, distance: '0 km', badge: 'KURA-RW-01' },
    ];

    const timeline: TimelineEvent[] = [
        makeEvent({ minutesAgo: 120, label: 'Planned roadwork commenced',   detail: 'KURA scheduled night patching — Uhuru Hwy N-S',     type: 'system',   actor: 'KURA',         completed: true }),
        makeEvent({ minutesAgo: 90,  label: 'Lane closure activated',       detail: 'Southbound lane 2 closed via VMS',                  type: 'operator', actor: 'James Otieno', completed: true }),
        makeEvent({ minutesAgo: 30,  label: 'Works ahead of schedule',      detail: 'Patching 80% complete — lane reopen imminent',      type: 'system',   actor: 'KURA-RW-01',   completed: true }),
        makeEvent({ minutesAgo: 10,  label: 'All lanes restored',           detail: 'Lane 2 reopened; cones cleared',                   type: 'system',   actor: 'KURA-RW-01',   completed: true }),
        makeEvent({ minutesAgo: 5,   label: 'Incident marked cleared',      detail: 'Traffic normalising — congestion index at baseline', type: 'operator', actor: 'Fatima Nkosi', completed: true }),
    ];

    return {
        id: 'INC-2026-0851',
        name: 'Planned roadwork — Uhuru Highway',
        location: 'Uhuru Highway – Museum Hill to Nyayo Stadium',
        zone: 'Zone 3 · Southbound',
        lat: -1.3001, lng: 36.8080,
        severity: 'low', status: 'cleared',
        detectedAt: ago(120), updatedAt: ago(5),
        confidence: 100,
        vehiclesAffected: 45, avgDelay: 6,
        congestionIndex: 12, clearanceEta: 0,
        recommendations, responders, timeline,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// Exported seed map — consumed by store.ts only
// ─────────────────────────────────────────────────────────────────────────────

export const incidentSeeds: [string, Incident][] = [
    ['INC-2026-0847', inc_0847()],
    ['INC-2026-0848', inc_0848()],
    ['INC-2026-0849', inc_0849()],
    ['INC-2026-0850', inc_0850()],
    ['INC-2026-0851', inc_0851()],
];