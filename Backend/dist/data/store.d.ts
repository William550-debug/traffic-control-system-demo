import type { Alert, Incident, Corridor, AuditEntry, Recommendation, SystemHealth } from '../types/backend-index.js';
export declare const alerts: Map<string, Alert>;
export declare const incidents: Map<string, Incident>;
export declare const corridors: Map<string, Corridor>;
export declare const auditLog: AuditEntry[];
export declare const recommendations: Map<string, Recommendation>;
export declare const systemHealth: SystemHealth;
export declare const predictiveData: {
    hotspots: {
        id: string;
        location: string;
        eta: number;
        severity: string;
        confidence: number;
    }[];
    peakHours: {
        hour: number;
        label: string;
        volumePct: number;
        incidents: number;
    }[];
    congestionForecast: {
        hour: number;
        volumePct: number;
    }[];
};
//# sourceMappingURL=store.d.ts.map