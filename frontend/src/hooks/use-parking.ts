// hooks/use-parking.ts
import { useState, useEffect, useCallback } from 'react';
import { Zone, ParkingRecommendation, ParkingAuditLog } from '@/types';

interface UseParkingReturn {
    zones: Zone[];
    selectedZone: Zone | null;
    setSelectedZone: (zone: Zone) => void;
    recommendations: ParkingRecommendation[];
    auditLogs: ParkingAuditLog[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    updateZone: (id: string, updates: Partial<Zone>) => Promise<void>;
    approveRecommendation: (id: string) => Promise<void>;
    rejectRecommendation: (id: string) => Promise<void>;
}

export function useParking(): UseParkingReturn {
    const [zones, setZones] = useState<Zone[]>([]);
    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
    const [recommendations, setRecommendations] = useState<ParkingRecommendation[]>([]);
    const [auditLogs, setAuditLogs] = useState<ParkingAuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            const [zonesRes, recsRes, logsRes] = await Promise.all([
                fetch('/api/parking/zones').then(res => res.json()),
                fetch('/api/parking/recommendations').then(res => res.json()),
                fetch('/api/parking/audit').then(res => res.json()),
            ]);
            setZones(zonesRes);
            setRecommendations(recsRes);
            setAuditLogs(logsRes);
            if (zonesRes.length > 0 && !selectedZone) {
                setSelectedZone(zonesRes[0]);
            }
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, [selectedZone]);

    const updateZone = useCallback(async (id: string, updates: Partial<Zone>) => {
        try {
            const res = await fetch(`/api/parking/zones/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error('Failed to update zone');
            const updatedZone = await res.json();
            setZones(prev => prev.map(z => z.id === id ? updatedZone : z));
            if (selectedZone?.id === id) setSelectedZone(updatedZone);
            
            // Refresh recommendations and audit logs (they may have changed)
            const [recsRes, logsRes] = await Promise.all([
                fetch('/api/parking/recommendations').then(res => res.json()),
                fetch('/api/parking/audit').then(res => res.json()),
            ]);
            setRecommendations(recsRes);
            setAuditLogs(logsRes);
        } catch (err) {
            throw err;
        }
    }, [selectedZone]);

    const approveRecommendation = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/parking/recommendations/${id}/approve`, { method: 'POST' });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to approve recommendation (HTTP ${res.status})`);
            }
            const result = await res.json();
            setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
            if (result.zone) {
                setZones(prev => prev.map(z => z.id === result.zone.id ? result.zone : z));
                if (selectedZone?.id === result.zone.id) setSelectedZone(result.zone);
            }
            const logsRes = await fetch('/api/parking/audit').then(res => res.json());
            setAuditLogs(logsRes);
        } catch (err) {
            throw err;
        }
    }, [selectedZone]);

    const rejectRecommendation = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/parking/recommendations/${id}/reject`, { method: 'POST' });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to reject recommendation (HTTP ${res.status})`);
            }
            setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
            const logsRes = await fetch('/api/parking/audit').then(res => res.json());
            setAuditLogs(logsRes);
        } catch (err) {
            throw err;
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return {
        zones,
        selectedZone,
        setSelectedZone,
        recommendations,
        auditLogs,
        loading,
        error,
        refresh: fetchAll,
        updateZone,
        approveRecommendation,
        rejectRecommendation,
    };
}