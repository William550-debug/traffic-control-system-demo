'use client';

/**
 * useAlertClaim
 * -------------
 * Manages cross-agency alert claiming (locking) and releasing.
 *
 * An alert can be "claimed" by one agency at a time (alert.claimedBy).
 * While claimed, other agencies see a lock banner and cannot take action.
 *
 * Flow:
 *   1. Operator hits "Claim" → PATCH /api/alerts { id, action: 'claim', agency }
 *   2. Server broadcasts 'alert:updated' WS event with claimedBy set
 *   3. All clients update — other agencies see lock banner
 *   4. Claiming agency resolves/ignores → lock releases automatically
 *   5. Or explicit "Release" → PATCH /api/alerts { id, action: 'release' }
 *
 * Returns:
 *   - claimAlert(id)   — claim on behalf of current user's agency
 *   - releaseAlert(id) — release the claim
 *   - isClaiming(id)   — pending state for a specific alert
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider';
import type { Agency } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseAlertClaimReturn {
    claimAlert:   (alertId: string) => Promise<void>;
    releaseAlert: (alertId: string) => Promise<void>;
    isClaiming:   (alertId: string) => boolean;
    isReleasing:  (alertId: string) => boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAlertClaim(
    /** Optimistic updater — same pattern as useAlerts setAlerts */
    onClaim:   (alertId: string, agency: Agency) => void,
    onRelease: (alertId: string) => void,
): UseAlertClaimReturn {
    const { user } = useAuth();

    const [claiming,  setClaiming]  = useState<Set<string>>(new Set());
    const [releasing, setReleasing] = useState<Set<string>>(new Set());

    const claimAlert = useCallback(async (alertId: string) => {
        if (!user?.agency) return;

        // Optimistic update
        setClaiming(prev => new Set(prev).add(alertId));
        onClaim(alertId, user.agency);

        try {
            await fetch('/api/alerts', {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    id:     alertId,
                    action: 'claim',
                    agency: user.agency,
                    userId: user.id,
                }),
            });
        } catch {
            // silent — optimistic update stands, WS will correct if needed
        } finally {
            setClaiming(prev => {
                const next = new Set(prev);
                next.delete(alertId);
                return next;
            });
        }
    }, [user, onClaim]);

    const releaseAlert = useCallback(async (alertId: string) => {
        // Optimistic update
        setReleasing(prev => new Set(prev).add(alertId));
        onRelease(alertId);

        try {
            await fetch('/api/alerts', {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    id:     alertId,
                    action: 'release',
                    userId: user?.id,
                }),
            });
        } catch {
            // silent
        } finally {
            setReleasing(prev => {
                const next = new Set(prev);
                next.delete(alertId);
                return next;
            });
        }
    }, [user, onRelease]);

    const isClaiming  = useCallback((id: string) => claiming.has(id),  [claiming]);
    const isReleasing = useCallback((id: string) => releasing.has(id), [releasing]);

    return { claimAlert, releaseAlert, isClaiming, isReleasing };
}