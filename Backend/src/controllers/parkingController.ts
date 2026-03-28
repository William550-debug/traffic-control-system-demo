import { Request, Response } from 'express';
import * as parkingData from '../data/parking.js';
import { Zone } from '../types/backend-index.js'; // ParkingAuditLog not used here, so removed

// Mock operator extraction – replace with real auth
function getOperator(req: Request): string {
    return (req.headers['x-operator'] as string) || 'System';
}

// Helper to log a zone action
function logZoneAction(
    operator: string,
    zone: Zone,
    action: string,
    type: 'approved' | 'overridden' | 'rejected', // matches ParkingAuditLog.type
    aiSuggestion?: string
) {
    parkingData.addAuditLog({
        operator,
        time: new Date().toISOString(),
        zone: zone.name,
        aiSuggestion: aiSuggestion || 'None',
        finalAction: action,
        type,
    });
}

export const getZones = (_req: Request, res: Response) => {
    try {
        const zones = parkingData.getZones();
        res.json(zones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getZoneById = (req: Request, res: Response) => {
    try {
        // req.params.id is string | string[] | undefined; we know it's a string for this route
        const id = req.params.id as string;
        const zone = parkingData.getZoneById(id);
        if (!zone) return res.status(404).json({ error: 'Zone not found' });
        res.json(zone);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateZone = (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const updates = req.body;
        const zone = parkingData.getZoneById(id);
        if (!zone) return res.status(404).json({ error: 'Zone not found' });

        // Basic validation
        if (updates.currentPrice !== undefined && (typeof updates.currentPrice !== 'number' || updates.currentPrice < 0)) {
            return res.status(400).json({ error: 'Invalid price' });
        }
        if (updates.locked !== undefined && typeof updates.locked !== 'boolean') {
            return res.status(400).json({ error: 'Invalid locked flag' });
        }
        if (updates.aiDisabled !== undefined && typeof updates.aiDisabled !== 'boolean') {
            return res.status(400).json({ error: 'Invalid aiDisabled flag' });
        }
        if (updates.occupied !== undefined && (typeof updates.occupied !== 'number' || updates.occupied < 0 || updates.occupied > zone.capacity)) {
            return res.status(400).json({ error: 'Invalid occupancy' });
        }

        const oldZone = { ...zone };
        const updatedZone = parkingData.updateZone(id, updates);
        if (!updatedZone) return res.status(500).json({ error: 'Failed to update zone' });

        // Determine what changed to log
        let logAction = '';
        let logType: 'approved' | 'overridden' | 'rejected' = 'overridden';
        if (updates.currentPrice !== undefined && updates.currentPrice !== oldZone.currentPrice) {
            logAction = `Price changed from KES ${oldZone.currentPrice} to KES ${updatedZone.currentPrice}`;
        } else if (updates.locked !== undefined && updates.locked !== oldZone.locked) {
            logAction = updates.locked ? 'Zone locked' : 'Zone unlocked';
        } else if (updates.aiDisabled !== undefined && updates.aiDisabled !== oldZone.aiDisabled) {
            logAction = updates.aiDisabled ? 'AI disabled' : 'AI enabled';
        } else if (updates.occupied !== undefined) {
            logAction = `Occupancy updated from ${oldZone.occupied} to ${updatedZone.occupied}`;
        } else {
            // No significant change, just return updated zone
            return res.json(updatedZone);
        }

        // Mark any pending recommendations for this zone as overridden
        const pendingRecs = parkingData.getRecommendations().filter(r => r.zoneId === id && r.status === 'pending');
        for (const rec of pendingRecs) {
            parkingData.updateRecommendationStatus(rec.id, 'overridden');
            parkingData.addAuditLog({
                operator: getOperator(req),
                time: new Date().toISOString(),
                zone: updatedZone.name,
                aiSuggestion: rec.action,
                finalAction: `Overridden by manual update: ${logAction}`,
                type: 'overridden',
            });
        }

        // Add audit log for the zone action
        logZoneAction(getOperator(req), updatedZone, logAction, logType);

        res.json(updatedZone);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getRecommendations = (_req: Request, res: Response) => {
    try {
        const recommendations = parkingData.getRecommendations();
        res.json(recommendations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const approveRecommendation = (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const rec = parkingData.getRecommendationById(id);
        if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
        if (rec.status !== 'pending') return res.status(400).json({ error: 'Recommendation already processed' });

        const zone = parkingData.getZoneById(rec.zoneId);
        if (!zone) return res.status(404).json({ error: 'Zone not found' });

        const operator = getOperator(req);
        let finalAction = '';
        let updatedZone: Zone | undefined = undefined;

        // Apply recommendation based on type
        if (rec.type === 'price_increase' || rec.type === 'price_decrease') {
            const match = rec.action.match(/(\d+)/);
            if (match) {
                const delta = parseInt(match[1], 10);
                let newPrice = zone.currentPrice;
                newPrice += rec.type === 'price_increase' ? delta : -delta;
                newPrice = Math.max(0, newPrice);
                updatedZone = parkingData.updateZone(zone.id, { currentPrice: newPrice });
                finalAction = `Price changed from KES ${zone.currentPrice} to KES ${newPrice}`;
            } else {
                finalAction = `Approved recommendation: ${rec.action}`;
            }
        } else {
            // For redirect or alert, just log approval
            finalAction = `Approved recommendation: ${rec.action}`;
        }

        parkingData.updateRecommendationStatus(id, 'approved', finalAction);

        parkingData.addAuditLog({
            operator,
            time: new Date().toISOString(),
            zone: zone.name,
            aiSuggestion: rec.action,
            finalAction,
            type: 'approved',
        });

        const response: any = { recommendation: { ...rec, status: 'approved' } };
        if (updatedZone) response.zone = updatedZone;
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const rejectRecommendation = (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const rec = parkingData.getRecommendationById(id);
        if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
        if (rec.status !== 'pending') return res.status(400).json({ error: 'Recommendation already processed' });

        const zone = parkingData.getZoneById(rec.zoneId);
        if (!zone) return res.status(404).json({ error: 'Zone not found' });

        const operator = getOperator(req);
        const finalAction = `Rejected recommendation: ${rec.action}`;

        parkingData.updateRecommendationStatus(id, 'rejected', finalAction);

        parkingData.addAuditLog({
            operator,
            time: new Date().toISOString(),
            zone: zone.name,
            aiSuggestion: rec.action,
            finalAction,
            type: 'rejected',
        });

        res.json({ recommendation: { ...rec, status: 'rejected' } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAuditLogs = (_req: Request, res: Response) => {
    try {
        const logs = parkingData.getAuditLogs();
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};