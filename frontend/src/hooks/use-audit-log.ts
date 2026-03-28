'use client';

import { useState, useCallback, useRef } from 'react';
import { useWsEvent }    from '@/providers/websocket-provider';
import { MOCK_ACTIONS }  from '@/lib/mock-data';
import { reviveAuditAction } from '@/lib/revive';
import type { AuditAction, ActionType, Agency } from '@/types';

const MAX_FEED_SIZE = 50;

interface LogActionArgs {
    type:        ActionType;
    performedBy: string;
    agency:      Agency;
    targetId:    string;
    targetLabel: string;
    details?:    Record<string, unknown>;
}

interface UseAuditLogReturn {
    actions:   AuditAction[];
    logAction: (args: LogActionArgs) => void;
}

// ── API helper ────────────────────────────────────────────────────────────────
// Fire-and-forget POST to /api/audit — never throws.
// Backend accepts: { type, performedBy, agency, targetId, targetLabel, details }
// Timestamp is serialised to ISO string for JSON transport.

async function persistAction(action: AuditAction): Promise<void> {
    try {
        await fetch('/api/audit', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                ...action,
                timestamp: action.timestamp.toISOString(),
            }),
        });
    } catch {
        // Offline or API unavailable — local state already updated, safe to ignore
    }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuditLog(): UseAuditLogReturn {
    const [actions, setActions] = useState<AuditAction[]>(MOCK_ACTIONS);
    // Stable ref so logAction is never re-created on re-render
    const setActionsRef = useRef(setActions);
    setActionsRef.current = setActions;

    // ── WebSocket — other operators' actions ──────────────────────────────────
    // The backend emits 'action:performed' after every addAudit() call.
    // This keeps the activity feed live across multiple operator sessions.
    useWsEvent<AuditAction>('action:performed', useCallback((event) => {
        const action = reviveAuditAction(event.payload);
        setActionsRef.current(prev =>
            [action, ...prev].slice(0, MAX_FEED_SIZE),
        );
    }, []));

    // ── logAction ─────────────────────────────────────────────────────────────
    // 1. Builds a typed AuditAction with a stable local ID + current timestamp.
    // 2. Prepends to local state immediately (optimistic).
    // 3. POSTs to /api/audit asynchronously — fire-and-forget.

    const logAction = useCallback((args: LogActionArgs) => {
        const action: AuditAction = {
            id:          `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type:        args.type,
            performedBy: args.performedBy,
            agency:      args.agency,
            timestamp:   new Date(),
            targetId:    args.targetId,
            targetLabel: args.targetLabel,
            details:     args.details,
        };

        setActionsRef.current(prev => [action, ...prev].slice(0, MAX_FEED_SIZE));
        void persistAction(action);
    }, []);

    return { actions, logAction };
}