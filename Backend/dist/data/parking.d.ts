import { Zone, ParkingRecommendation, ParkingAuditLog } from '../types/backend-index.js';
export declare function getZones(): Zone[];
export declare function getZoneById(id: string): Zone | undefined;
export declare function updateZone(id: string, updates: Partial<Zone>): Zone | undefined;
export declare function getRecommendations(): ParkingRecommendation[];
export declare function getRecommendationById(id: string): ParkingRecommendation | undefined;
export declare function updateRecommendationStatus(id: string, status: ParkingRecommendation['status'], finalAction?: string): ParkingRecommendation | undefined;
export declare function addAuditLog(log: Omit<ParkingAuditLog, 'id'>): ParkingAuditLog;
export declare function getAuditLogs(): ParkingAuditLog[];
//# sourceMappingURL=parking.d.ts.map