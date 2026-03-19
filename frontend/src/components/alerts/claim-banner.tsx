'use client';

/**
 * ClaimBanner
 * -----------
 * Shown on AlertCard and AlertDrawer when alert.claimedBy is set.
 *
 * Two variants:
 *   - 'locked'  — another agency has claimed it. Shows who + a Release button
 *                 if the current user's agency is the claimer.
 *   - 'mine'    — the current user's agency claimed it. Shows a Release button.
 *
 * Also exports:
 *   - AgeClock  — small inline age indicator (shows when alert is stale)
 *   - ClaimButton — standalone "Claim" button for unclaimed alerts
 */

import { Lock, Unlock, Clock, ShieldAlert } from 'lucide-react';
import { Badge }  from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn }     from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { getAlertAgingState } from '@/hooks/use-alert-aging';
import type { Alert, Agency } from '@/types';

// ─── Agency display config ────────────────────────────────────────────────────

const AGENCY_LABEL: Record<Agency, string> = {
    traffic:   'Traffic Authority',
    emergency: 'Emergency Services',
    transport: 'Transport Dept',
    planning:  'City Planning',
};

const AGENCY_COLOR: Record<Agency, string> = {
    traffic:   'var(--accent-primary)',
    emergency: 'var(--severity-critical)',
    transport: 'var(--severity-medium)',
    planning:  'var(--accent-secondary)',
};

// ─── ClaimBanner ─────────────────────────────────────────────────────────────

interface ClaimBannerProps {
    alert:       Alert;
    onRelease:   (id: string) => void;
    onClaim:     (id: string) => void;
    isReleasing: boolean;
    isClaiming:  boolean;
    /** 'card' = compact inline; 'drawer' = full-width with more detail */
    variant?:    'card' | 'drawer';
}

export function ClaimBanner({
                                alert,
                                onRelease,
                                onClaim,
                                isReleasing,
                                isClaiming,
                                variant = 'card',
                            }: ClaimBannerProps) {
    const { user } = useAuth();
    const claimedBy = alert.claimedBy;

    if (!claimedBy) return null;

    const isMyAgency   = user?.agency === claimedBy;
    const agencyColor  = AGENCY_COLOR[claimedBy];
    const agencyLabel  = AGENCY_LABEL[claimedBy];
    const isCompact    = variant === 'card';

    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-lg',
                isCompact ? 'px-[8px] py-[5px]' : 'px-4 py-3',
            )}
            style={{
                background:  isMyAgency
                    ? `${agencyColor}10`
                    : 'rgba(255,255,255,0.04)',
                border:      `1px solid ${isMyAgency ? `${agencyColor}30` : 'var(--border-default)'}`,
                borderLeft:  `3px solid ${agencyColor}`,
            }}
        >
            {/* Lock icon */}
            {isMyAgency
                ? <Unlock size={isCompact ? 10 : 13} strokeWidth={2} style={{ color: agencyColor, flexShrink: 0 }} />
                : <Lock   size={isCompact ? 10 : 13} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            }

            {/* Label */}
            <span
                className={cn(
                    'flex-1 min-w-0',
                    isCompact ? 'text-[0.52rem]' : 'text-[0.62rem]',
                )}
                style={{ color: isMyAgency ? agencyColor : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
            >
        {isMyAgency
            ? `Claimed by your agency`
            : `Handled by ${agencyLabel}`
        }
      </span>

            {/* Agency badge */}
            <Badge
                variant="outline"
                className={cn(
                    'shrink-0 uppercase tracking-[0.08em]',
                    isCompact ? 'h-[14px] px-[5px] text-[0.44rem]' : 'h-[18px] px-[7px] text-[0.5rem]',
                )}
                style={{
                    fontFamily:  'var(--font-mono)',
                    background:  `${agencyColor}10`,
                    borderColor: `${agencyColor}30`,
                    color:       agencyColor,
                }}
            >
                {claimedBy}
            </Badge>

            {/* Release button — only shown to the owning agency */}
            {isMyAgency && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => { e.stopPropagation(); onRelease(alert.id); }}
                    disabled={isReleasing}
                    className={cn(
                        'shrink-0 font-medium tracking-[0.04em]',
                        isCompact
                            ? 'h-[16px] px-[6px] text-[0.46rem]'
                            : 'h-[22px] px-[8px] text-[0.54rem]',
                    )}
                    style={{
                        fontFamily:  'var(--font-mono)',
                        color:       'var(--text-muted)',
                        background:  'rgba(255,255,255,0.04)',
                        border:      '1px solid var(--border-default)',
                    }}
                >
                    {isReleasing ? '…' : 'Release'}
                </Button>
            )}
        </div>
    );
}

// ─── ClaimButton ──────────────────────────────────────────────────────────────

/**
 * Shown on unclaimed alerts so operators can mark it as theirs.
 * Sits inline in the action button row.
 */
interface ClaimButtonProps {
    alert:      Alert;
    onClaim:    (id: string) => void;
    isClaiming: boolean;
    variant?:   'card' | 'drawer';
}

export function ClaimButton({
                                alert, onClaim, isClaiming, variant = 'card',
                            }: ClaimButtonProps) {
    const isCompact = variant === 'card';

    // Don't show if already claimed or in a terminal state
    if (alert.claimedBy) return null;
    if (alert.status === 'resolved' || alert.status === 'ignored' || alert.status === 'expired') {
        return null;
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={e => { e.stopPropagation(); onClaim(alert.id); }}
            disabled={isClaiming}
            className={cn(
                'flex items-center gap-[4px] shrink-0 font-medium tracking-[0.04em] transition-all duration-150',
                isCompact ? 'h-[22px] px-[7px] text-[0.52rem]' : 'h-[28px] px-[10px] text-[0.58rem]',
            )}
            style={{
                fontFamily:  'var(--font-mono)',
                background:  'rgba(124,106,247,0.06)',
                border:      '1px solid rgba(124,106,247,0.2)',
                color:       'var(--accent-secondary)',
            }}
        >
            {isClaiming
                ? <span className="inline-block w-[8px] h-[8px] rounded-full border-[1.5px] border-current border-t-transparent animate-spin" />
                : <ShieldAlert size={isCompact ? 10 : 12} strokeWidth={2} />
            }
            {isClaiming ? 'Claiming…' : 'Claim'}
        </Button>
    );
}

// ─── AgeClock ─────────────────────────────────────────────────────────────────

/**
 * Inline age indicator. Shows a warning when an alert is stale (30min+)
 * or near auto-resolve (45min+). Used inside AlertCard.
 */
interface AgeClockProps {
    alert: Alert;
}

export function AgeClock({ alert }: AgeClockProps) {
    const { ageMinutes, isStale, isNearExpiry } = getAlertAgingState(alert);

    // Only show when the alert is getting old
    if (ageMinutes < 20) return null;

    const color = isNearExpiry
        ? 'var(--severity-critical)'
        : isStale
            ? 'var(--severity-high)'
            : 'var(--text-muted)';

    const label = ageMinutes >= 60
        ? `${Math.floor(ageMinutes / 60)}h ${ageMinutes % 60}m`
        : `${ageMinutes}m`;

    return (
        <span
            className="flex items-center gap-[3px] shrink-0"
            title={`Alert is ${label} old${isNearExpiry ? ' — approaching auto-resolve' : isStale ? ' — auto-downgraded' : ''}`}
            style={{ animation: isNearExpiry ? 'pulse-dot 1.5s ease infinite' : 'none' }}
        >
      <Clock
          size={9}
          strokeWidth={2}
          style={{ color, flexShrink: 0 }}
      />
      <span
          className="text-[0.5rem] tabular-nums"
          style={{ color, fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </span>
            {isNearExpiry && (
                <span
                    className="text-[0.44rem] tracking-[0.06em] uppercase"
                    style={{ color, fontFamily: 'var(--font-mono)' }}
                >
          expiring
        </span>
            )}
    </span>
    );
}