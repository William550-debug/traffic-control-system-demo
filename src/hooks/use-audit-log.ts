'use client';

import { useState, useCallback } from 'react';
import { useWsEvent }   from '@/providers/websocket-provider';
import { MOCK_ACTIONS } from '@/lib/mock-data';
import type { AuditAction, ActionType, Agency } from '@/types';

const MAX_FEED_SIZE = 50;

// Object-style arg so callers don't need to remember positional order
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

export function useAuditLog(): UseAuditLogReturn {
    const [actions, setActions] = useState<AuditAction[]>(MOCK_ACTIONS);

    useWsEvent<AuditAction>('action:performed', useCallback((event) => {
        setActions(prev => [event.payload, ...prev].slice(0, MAX_FEED_SIZE));
    }, []));

    const logAction = useCallback((args: LogActionArgs) => {
        const action: AuditAction = {
            id:          `action-${Date.now()}`,
            type:        args.type,
            performedBy: args.performedBy,
            agency:      args.agency,
            timestamp:   new Date(),
            targetId:    args.targetId,
            targetLabel: args.targetLabel,
            details:     args.details,
        };
        setActions(prev => [action, ...prev].slice(0, MAX_FEED_SIZE));
    }, []);

    return { actions, logAction };
}