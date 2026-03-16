'use client';

import { useState, useCallback, useRef } from 'react';
import { useWsEvent }   from '@/providers/websocket-provider';
import { MOCK_ACTIONS } from '@/lib/mock-data';
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

// Fire-and-forget POST to audit API — never throws
async function persistAction(action: AuditAction): Promise<void> {
    try {
        await fetch('/api/audit', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                ...action,
                // Date → ISO string for JSON transport
                timestamp: action.timestamp.toISOString(),
            }),
        });
    } catch {
        // Offline or API unavailable — local state already updated, safe to ignore
    }
}

export function useAuditLog(): UseAuditLogReturn {
    const [actions, setActions] = useState<AuditAction[]>(MOCK_ACTIONS);
    // Stable ref so logAction never re-creates on re-render
    const setActionsRef = useRef(setActions);
    setActionsRef.current = setActions;

    useWsEvent<AuditAction>('action:performed', useCallback((event) => {
        const action = reviveAuditAction(event.payload);
        setActionsRef.current(prev =>
            [action, ...prev].slice(0, MAX_FEED_SIZE)
        );
    }, []));

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

        // Optimistic local update first
        setActionsRef.current(prev => [action, ...prev].slice(0, MAX_FEED_SIZE));

        // Persist asynchronously — non-blocking
        void persistAction(action);
    }, []);

    return { actions, logAction };
}