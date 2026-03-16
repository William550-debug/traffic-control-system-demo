/**
 * revive.ts
 *
 * JSON has no Date type — every Date field comes back from fetch() as a
 * plain ISO string.  These helpers re-hydrate string → Date for each model
 * so that .getTime(), formatRelativeTime(), countdown timers, etc. all work.
 *
 * Usage:
 *   fetch('/api/alerts').then(r => r.json()).then((d: Alert[]) => d.map(reviveAlert))
 */

import type { Alert, Recommendation, AuditAction, SystemHealth, Corridor } from '@/types';

// ── Generic helper ─────────────────────────────────────────────────────────
function toDate(v: unknown): Date {
    if (v instanceof Date) return v;
    if (typeof v === 'string' || typeof v === 'number') return new Date(v);
    return new Date(); // fallback — should never happen with well-formed data
}

function maybeDate(v: unknown): Date | undefined {
    if (v === null || v === undefined) return undefined;
    return toDate(v);
}

// ── Alert ──────────────────────────────────────────────────────────────────
export function reviveAlert(a: Alert): Alert {
    return {
        ...a,
        detectedAt:  toDate(a.detectedAt),
        updatedAt:   toDate(a.updatedAt),
        expiresAt:   maybeDate(a.expiresAt),
        escalatedAt: maybeDate(a.escalatedAt),
        timer: a.timer
            ? { ...a.timer, expiresAt: toDate(a.timer.expiresAt) }
            : undefined,
        confidenceMetadata: a.confidenceMetadata
            ? {
                ...a.confidenceMetadata,
                lastTrainingUpdate: toDate(a.confidenceMetadata.lastTrainingUpdate),
            }
            : undefined,
    };
}

// ── Recommendation ─────────────────────────────────────────────────────────
export function reviveRecommendation(r: Recommendation): Recommendation {
    return {
        ...r,
        generatedAt: toDate(r.generatedAt),
        expiresAt:   toDate(r.expiresAt),
        approvedAt:  maybeDate(r.approvedAt),
    };
}

// ── AuditAction ────────────────────────────────────────────────────────────
export function reviveAuditAction(a: AuditAction): AuditAction {
    return {
        ...a,
        timestamp: toDate(a.timestamp),
    };
}

// ── SystemHealth ───────────────────────────────────────────────────────────
export function reviveSystemHealth(h: SystemHealth): SystemHealth {
    return {
        ...h,
        lastRefreshedAt: toDate(h.lastRefreshedAt),
    };
}

// ── Corridor ───────────────────────────────────────────────────────────────
export function reviveCorridor(c: Corridor): Corridor {
    return {
        ...c,
        lockedAt: maybeDate(c.lockedAt),
    };
}