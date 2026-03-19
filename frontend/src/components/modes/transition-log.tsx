'use client';

/**
 * TransitionLog — responsive rewrite
 *
 * Responsiveness fixes:
 *   – Header wraps filter chips + badge below title on narrow widths
 *   – Table wrapped in overflow-x-auto so it scrolls horizontally rather than crushing
 *   – All fixed text-[x.xrem] replaced with clamp()
 *   – py-[10px] on all cells for consistent row height
 *   – First/last cell padding matches the wrapper's visual edge
 *   – Filter chip row scrolls horizontally on very small screens
 */

import { useMemo, useState } from 'react';
import {
    Bot,
    ShieldCheck,
    User,
    Cpu,
    ChevronDown,
    ChevronRight,
    ArrowRight,
    History,
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge }   from '@/components/ui/badge';
import { cn }      from '@/lib/utils';
import { useMode } from '@/providers/mode-provider';
import type { ModeTransition, OperatingMode } from '@/types';

// ─── Design tokens ────────────────────────────────────────────────────────────

const MODE_COLOR: Record<OperatingMode, string> = {
    'AI-Prioritized':  'var(--accent-primary)',
    'Human-Validated': 'var(--severity-medium)',
};

const MODE_BG: Record<OperatingMode, string> = {
    'AI-Prioritized':  'rgba(59,158,255,0.08)',
    'Human-Validated': 'rgba(245,197,24,0.08)',
};

const MODE_BORDER: Record<OperatingMode, string> = {
    'AI-Prioritized':  'rgba(59,158,255,0.22)',
    'Human-Validated': 'rgba(245,197,24,0.22)',
};

const MODE_SHORT: Record<OperatingMode, string> = {
    'AI-Prioritized':  'AI',
    'Human-Validated': 'HV',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-KE', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
}

function formatDate(date: Date): string {
    const now      = new Date();
    const diffDays = Math.floor(
        (now.setHours(0,0,0,0) - new Date(date).setHours(0,0,0,0)) / 86_400_000
    );
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return new Date(date).toLocaleDateString('en-KE', {
        weekday: 'short', day: 'numeric', month: 'short',
    });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeBadge({ mode }: { mode: OperatingMode }) {
    const Icon = mode === 'AI-Prioritized' ? Bot : ShieldCheck;
    return (
        <Badge
            variant="outline"
            className="flex items-center gap-[4px] h-[19px] px-[7px] whitespace-nowrap"
            style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      'clamp(0.46rem, 0.4rem + 0.14vw, 0.52rem)',
                fontWeight:    700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background:    MODE_BG[mode],
                borderColor:   MODE_BORDER[mode],
                color:         MODE_COLOR[mode],
            }}
        >
            <Icon size={9} strokeWidth={2.5} />
            {MODE_SHORT[mode]}
        </Badge>
    );
}

function TriggerBadge({ triggeredBy }: { triggeredBy: 'auto' | 'manual' }) {
    const isAuto = triggeredBy === 'auto';
    return (
        <Badge
            variant="outline"
            className="flex items-center gap-[4px] h-[19px] px-[7px] whitespace-nowrap"
            style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      'clamp(0.46rem, 0.4rem + 0.14vw, 0.52rem)',
                fontWeight:    700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background:    isAuto ? 'rgba(124,106,247,0.08)' : 'rgba(34,197,94,0.08)',
                borderColor:   isAuto ? 'rgba(124,106,247,0.22)' : 'rgba(34,197,94,0.22)',
                color:         isAuto ? 'var(--accent-secondary)' : 'var(--status-online)',
            }}
        >
            {isAuto ? <Cpu size={9} strokeWidth={2} /> : <User size={9} strokeWidth={2} />}
            {triggeredBy}
        </Badge>
    );
}

// ─── Expandable row ───────────────────────────────────────────────────────────

const ROW_PY  = "py-[10px]";
const CELL_PL = "pl-5";
const CELL_PR = "pr-4";

function TransitionRow({
                           transition, isLatest, isLast,
                       }: {
    transition: ModeTransition;
    isLatest:   boolean;
    isLast:     boolean;
}) {
    const [open, setOpen] = useState(false);
    const toColor         = MODE_COLOR[transition.to];

    return (
        <>
            <TableRow
                className={cn(
                    'group cursor-pointer transition-colors duration-150',
                    isLatest && 'bg-[rgba(59,158,255,0.025)]',
                )}
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                style={{
                    borderBottom: isLast && !open ? 'none' : '1px solid var(--border-subtle)',
                }}
            >
                {/* Time */}
                <TableCell className={`${ROW_PY} ${CELL_PL} whitespace-nowrap`} style={{ width: 90 }}>
                    <div className="flex flex-col gap-[3px]">
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.54rem, 0.48rem + 0.16vw, 0.62rem)',
                            color:      'var(--text-secondary)',
                            lineHeight: 1,
                        }}>
                            {formatTime(transition.triggeredAt)}
                        </span>
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.46rem, 0.4rem + 0.14vw, 0.52rem)',
                            color:      'var(--text-disabled)',
                            lineHeight: 1,
                        }}>
                            {formatDate(transition.triggeredAt)}
                        </span>
                    </div>
                </TableCell>

                {/* From → To */}
                <TableCell className={`${ROW_PY} px-3 whitespace-nowrap`}>
                    <div className="flex items-center gap-[6px] flex-wrap">
                        <ModeBadge mode={transition.from} />
                        <ArrowRight size={10} strokeWidth={2} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                        <ModeBadge mode={transition.to} />
                        {isLatest && (
                            <Badge
                                variant="outline"
                                className="h-[14px] px-[5px]"
                                style={{
                                    fontFamily:  'var(--font-mono)',
                                    fontSize:    '0.44rem',
                                    background:  'rgba(59,158,255,0.08)',
                                    borderColor: 'rgba(59,158,255,0.22)',
                                    color:       'var(--accent-primary)',
                                    letterSpacing: '0.06em',
                                }}
                            >
                                Latest
                            </Badge>
                        )}
                    </div>
                </TableCell>

                {/* Trigger */}
                <TableCell className={`${ROW_PY} px-3 whitespace-nowrap`} style={{ width: 90 }}>
                    <TriggerBadge triggeredBy={transition.triggeredBy} />
                </TableCell>

                {/* Reason — truncated, chevron hint on hover */}
                <TableCell className={`${ROW_PY} px-3`}>
                    <div className="flex items-center gap-2">
                        <span
                            className={cn('leading-snug flex-1 min-w-0', !open && 'line-clamp-1')}
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   'clamp(0.54rem, 0.48rem + 0.16vw, 0.62rem)',
                                color:      'var(--text-secondary)',
                            }}
                        >
                            {transition.reason}
                        </span>
                        {open
                            ? <ChevronDown
                                size={11}
                                strokeWidth={2}
                                className="shrink-0"
                                style={{ color: 'var(--text-disabled)' }}
                            />
                            : <ChevronRight
                                size={11}
                                strokeWidth={2}
                                className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
                                style={{ color: 'var(--text-disabled)' }}
                            />
                        }
                    </div>
                </TableCell>

                {/* Operator */}
                <TableCell className={`${ROW_PY} px-3 ${CELL_PR} whitespace-nowrap`} style={{ width: 100 }}>
                    {transition.operatorId ? (
                        <div className="flex items-center gap-[5px]">
                            <User size={10} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   'clamp(0.52rem, 0.46rem + 0.16vw, 0.6rem)',
                                color:      'var(--text-secondary)',
                            }}>
                                {transition.operatorId}
                            </span>
                        </div>
                    ) : (
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.52rem, 0.46rem + 0.16vw, 0.6rem)',
                            color:      'var(--text-disabled)',
                        }}>
                            System
                        </span>
                    )}
                </TableCell>
            </TableRow>

            {/* Expanded detail row */}
            {open && (
                <TableRow style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
                    <TableCell className={`py-0 ${CELL_PL}`} />
                    <TableCell colSpan={4} className={`py-0 pl-0 ${CELL_PR} pb-3`}>
                        <div
                            className="flex flex-col gap-[6px] px-4 py-3 rounded-xl"
                            style={{
                                background: 'rgba(255,255,255,0.022)',
                                border:     '1px solid var(--border-subtle)',
                                borderLeft: `2px solid ${toColor}50`,
                                animation:  'slide-in-up 150ms ease',
                            }}
                        >
                            <p
                                className="m-0"
                                style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      'clamp(0.6rem, 0.54rem + 0.18vw, 0.68rem)',
                                    color:         'var(--text-primary)',
                                    lineHeight:    1.45,
                                }}
                            >
                                {transition.reason}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-[3px]">
                                <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize:   'clamp(0.46rem, 0.4rem + 0.14vw, 0.52rem)',
                                    color:      'var(--text-disabled)',
                                }}>
                                    ID: {transition.id}
                                </span>
                                {transition.operatorId && (
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   'clamp(0.46rem, 0.4rem + 0.14vw, 0.52rem)',
                                        color:      'var(--text-disabled)',
                                    }}>
                                        Operator: {transition.operatorId}
                                    </span>
                                )}
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell colSpan={5} className="py-20 text-center">
                <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-disabled)' }}>
                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-full"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border:     '1px solid var(--border-subtle)',
                        }}
                    >
                        <History size={16} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                    </div>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      'clamp(0.56rem, 0.5rem + 0.18vw, 0.64rem)',
                        letterSpacing: '0.06em',
                    }}>
                        No transitions recorded this session
                    </span>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TransitionLogProps {
    maxRows?: number;
}

export function TransitionLog({ maxRows = 50 }: TransitionLogProps) {
    const { transitions } = useMode();
    const [filter, setFilter] = useState<'all' | 'auto' | 'manual'>('all');

    const filtered = useMemo(() => {
        const list = filter === 'all'
            ? transitions
            : transitions.filter(t => t.triggeredBy === filter);
        return list.slice(0, maxRows);
    }, [transitions, filter, maxRows]);

    return (
        <div
            className="rounded-xl overflow-hidden flex flex-col"
            style={{
                background: 'var(--bg-raised)',
                border:     '1px solid var(--border-default)',
            }}
        >
            {/* ── Header ── */}
            <div
                className="flex flex-wrap items-center gap-x-3 gap-y-3 px-4 sm:px-5 py-4 shrink-0"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
                {/* Title + count */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ArrowRight size={14} strokeWidth={2.5} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <div className="min-w-0">
                        <h2 className="m-0 leading-none mb-[3px]" style={{
                            fontFamily: 'var(--font-display)',
                            fontSize:   'clamp(0.7rem, 0.62rem + 0.26vw, 0.82rem)',
                            fontWeight: 700,
                            color:      'var(--text-primary)',
                        }}>
                            Transition Log
                        </h2>
                        <p className="m-0" style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.48rem, 0.42rem + 0.14vw, 0.56rem)',
                            color:      'var(--text-muted)',
                        }}>
                            Last {Math.min(transitions.length, maxRows)} of {transitions.length} this session
                        </p>
                    </div>
                </div>

                {/* Filter chips + count badge — scrollable row on xs */}
                <div className="flex items-center gap-[5px] overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
                    {(['all', 'auto', 'manual'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className="rounded-md px-[8px] transition-all duration-150 whitespace-nowrap shrink-0"
                            style={{
                                height:        24,
                                fontFamily:    'var(--font-mono)',
                                fontSize:      'clamp(0.46rem, 0.4rem + 0.14vw, 0.54rem)',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                background:    filter === f ? 'rgba(59,158,255,0.12)' : 'transparent',
                                border:        `1px solid ${filter === f ? 'rgba(59,158,255,0.32)' : 'var(--border-default)'}`,
                                color:         filter === f ? 'var(--accent-primary)' : 'var(--text-muted)',
                                cursor:        'pointer',
                                outline:       'none',
                            }}
                        >
                            {f}
                        </button>
                    ))}
                    <Badge
                        variant="outline"
                        className="h-[19px] px-[8px] tabular-nums shrink-0"
                        style={{
                            fontFamily:  'var(--font-mono)',
                            fontSize:    'clamp(0.46rem, 0.4rem + 0.14vw, 0.54rem)',
                            fontWeight:  700,
                            background:  'transparent',
                            borderColor: 'var(--border-default)',
                            color:       'var(--text-muted)',
                        }}
                    >
                        {filtered.length}
                    </Badge>
                </div>
            </div>

            {/*
             * ── Table ──
             * overflow-x-auto wraps the table so it scrolls horizontally on
             * narrow screens rather than squashing columns into nothing.
             * max-h-[420px] + overflow-y-auto creates a virtual scroll window
             * without needing shadcn ScrollArea here.
             */}
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 420 }}>
                <Table style={{ minWidth: 560 }}>
                    <TableHeader className="sticky top-0 z-10">
                        <TableRow
                            className="hover:bg-transparent"
                            style={{
                                background:   'var(--bg-elevated)',
                                borderBottom: '1px solid var(--border-default)',
                            }}
                        >
                            {[
                                { label: 'Time',       pl: CELL_PL, w: '90px'  },
                                { label: 'Transition', pl: 'px-3',  w: 'auto'  },
                                { label: 'Trigger',    pl: 'px-3',  w: '90px'  },
                                { label: 'Reason',     pl: 'px-3',  w: 'auto'  },
                                { label: 'Operator',   pl: 'px-3',  w: '100px' },
                            ].map(col => (
                                <TableHead
                                    key={col.label}
                                    className={`py-3 ${col.pl} whitespace-nowrap`}
                                    style={{
                                        width:         col.w,
                                        fontFamily:    'var(--font-mono)',
                                        fontSize:      'clamp(0.48rem, 0.42rem + 0.14vw, 0.54rem)',
                                        fontWeight:    600,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        color:         'var(--text-muted)',
                                    }}
                                >
                                    {col.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {filtered.length === 0 ? (
                            <EmptyState />
                        ) : (
                            filtered.map((t, i) => (
                                <TransitionRow
                                    key={`${t.id} - ${i}`}
                                    transition={t}
                                    isLatest={i === 0}
                                    isLast={i === filtered.length - 1}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}