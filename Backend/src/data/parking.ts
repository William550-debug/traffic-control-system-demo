import {
    Zone,
    ParkingRecommendation,
    ParkingAuditLog,
    ZoneStatus,
} from '../types/backend-index.js';

// Mock data (same as frontend but timestamps as ISO strings)
let zones: Zone[] = [
    { id: "Z-A", name: "Zone Alpha", location: "Upper Hill, Nairobi", capacity: 120, occupied: 114, status: "critical", currentPrice: 150, aiPrice: 220, locked: false, aiDisabled: false, forecast30: 98, forecast60: 100, forecast120: 87 },
    { id: "Z-B", name: "Zone Bravo", location: "Westlands CBD", capacity: 80, occupied: 72, status: "high", currentPrice: 100, aiPrice: 160, locked: false, aiDisabled: false, forecast30: 91, forecast60: 95, forecast120: 78 },
    { id: "Z-C", name: "Zone Charlie", location: "Kilimani", capacity: 95, occupied: 61, status: "moderate", currentPrice: 100, aiPrice: null, locked: false, aiDisabled: false, forecast30: 68, forecast60: 74, forecast120: 63 },
    { id: "Z-D", name: "Zone Delta", location: "Ngong Road", capacity: 60, occupied: 18, status: "low", currentPrice: 80, aiPrice: 60, locked: true, aiDisabled: false, forecast30: 32, forecast60: 45, forecast120: 71 },
    { id: "Z-E", name: "Zone Echo", location: "Parklands", capacity: 110, occupied: 98, status: "critical", currentPrice: 120, aiPrice: 200, locked: false, aiDisabled: true, forecast30: 100, forecast60: 100, forecast120: 90 },
    { id: "Z-F", name: "Zone Foxtrot", location: "Hurlingham", capacity: 75, occupied: 52, status: "moderate", currentPrice: 90, aiPrice: null, locked: false, aiDisabled: false, forecast30: 71, forecast60: 65, forecast120: 58 },
];

let recommendations: ParkingRecommendation[] = [
    { id: "R-001", zoneId: "Z-A", zoneName: "Zone Alpha", action: "Increase pricing by KES 70", reason: "Zone at 95% capacity with rising demand from Upper Hill towers", confidence: 92, impact: "Expected 18% congestion reduction in 20 mins", type: "price_increase", timestamp: new Date().toISOString(), status: "pending" },
    { id: "R-002", zoneId: "Z-E", zoneName: "Zone Echo", action: "Redirect demand to Zone Charlie", reason: "Zone Echo at full capacity, Zone Charlie at 64% — 800m apart", confidence: 87, impact: "Absorbs ~30 vehicles, reduces search time by 8 mins", type: "redirect", timestamp: new Date().toISOString(), status: "pending" },
    { id: "R-003", zoneId: "Z-B", zoneName: "Zone Bravo", action: "Increase pricing by KES 60", reason: "Westlands peak hour approaching, 90% occupancy trending", confidence: 78, impact: "Expected 12% demand shift to nearby zones", type: "price_increase", timestamp: new Date().toISOString(), status: "pending" },
    { id: "R-004", zoneId: "Z-D", zoneName: "Zone Delta", action: "Decrease pricing by KES 20", reason: "Zone underutilized at 30%, incentivize usage", confidence: 81, impact: "Projected 25% increase in utilization within 60 mins", type: "price_decrease", timestamp: new Date().toISOString(), status: "approved" },
];

let auditLogs: ParkingAuditLog[] = [
    { id: "A-001", operator: "Odhiambo K.", time: new Date().toISOString(), zone: "Zone Delta", aiSuggestion: "Decrease by KES 20", finalAction: "Approved — KES 60", type: "approved" },
    { id: "A-002", operator: "Wanjiru M.", time: new Date().toISOString(), zone: "Zone Alpha", aiSuggestion: "Increase by KES 50", finalAction: "Override — KES 180 (manual)", type: "overridden" },
    { id: "A-003", operator: "Kipchoge L.", time: new Date().toISOString(), zone: "Zone Bravo", aiSuggestion: "Redirect to Zone Foxtrot", finalAction: "Rejected — insufficient capacity", type: "rejected" },
    { id: "A-004", operator: "Akinyi P.", time: new Date().toISOString(), zone: "Zone Echo", aiSuggestion: "Increase by KES 80", finalAction: "Approved — KES 200", type: "approved" },
    { id: "A-005", operator: "Odhiambo K.", time: new Date().toISOString(), zone: "Zone Charlie", aiSuggestion: "No action needed", finalAction: "Manual lock applied", type: "overridden" },
];

// Helper: compute status from occupancy
function computeStatus(occupancy: number): ZoneStatus {
    if (occupancy >= 90) return "critical";
    if (occupancy >= 75) return "high";
    if (occupancy >= 50) return "moderate";
    return "low";
}

function refreshZoneStatuses() {
    zones.forEach(zone => {
        const pct = Math.round((zone.occupied / zone.capacity) * 100);
        zone.status = computeStatus(pct);
    });
}

export function getZones(): Zone[] {
    refreshZoneStatuses();
    return zones;
}

export function getZoneById(id: string): Zone | undefined {
    refreshZoneStatuses();
    return zones.find(z => z.id === id);
}

export function updateZone(id: string, updates: Partial<Zone>): Zone | undefined {
    const index = zones.findIndex(z => z.id === id);
    if (index === -1) return undefined;
    const old = zones[index];
    const updated = { ...old, ...updates };
    if (updates.occupied !== undefined || updates.capacity !== undefined) {
        const pct = Math.round((updated.occupied / updated.capacity) * 100);
        updated.status = computeStatus(pct);
    }
    zones[index] = updated;
    return updated;
}

export function getRecommendations(): ParkingRecommendation[] {
    return recommendations;
}

export function getRecommendationById(id: string): ParkingRecommendation | undefined {
    return recommendations.find(r => r.id === id);
}

export function updateRecommendationStatus(
    id: string,
    status: ParkingRecommendation['status'],
    finalAction?: string
): ParkingRecommendation | undefined {
    const index = recommendations.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    const updated = { ...recommendations[index], status };
    recommendations[index] = updated;
    return updated;
}

export function addAuditLog(log: Omit<ParkingAuditLog, 'id'>): ParkingAuditLog {
    const id = `A-${(auditLogs.length + 1).toString().padStart(3, '0')}`;
    const newLog = { id, ...log };
    auditLogs.push(newLog);
    return newLog;
}

export function getAuditLogs(): ParkingAuditLog[] {
    return auditLogs;
}