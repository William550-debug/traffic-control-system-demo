import type { Severity, AlertType, CorridorStatus, TimelineSlot } from '@/types';

// ── Severity helpers ──────────────────────
export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high:     1,
  medium:   2,
  low:      3,
  info:     4,
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
  info:     'Info',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'var(--severity-critical)',
  high:     'var(--severity-high)',
  medium:   'var(--severity-medium)',
  low:      'var(--severity-low)',
  info:     'var(--severity-info)',
};

export const SEVERITY_BG: Record<Severity, string> = {
  critical: 'rgba(255, 59, 59, 0.12)',
  high:     'rgba(255, 136, 0, 0.12)',
  medium:   'rgba(245, 197, 24, 0.1)',
  low:      'rgba(59, 158, 255, 0.1)',
  info:     'rgba(78, 205, 196, 0.1)',
};

export const SEVERITY_BORDER: Record<Severity, string> = {
  critical: 'rgba(255, 59, 59, 0.3)',
  high:     'rgba(255, 136, 0, 0.3)',
  medium:   'rgba(245, 197, 24, 0.25)',
  low:      'rgba(59, 158, 255, 0.25)',
  info:     'rgba(78, 205, 196, 0.2)',
};

export function sortBySeverity<T extends { severity: Severity }>(items: T[]): T[] {
  return [...items].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

// ── Alert type labels & icons ─────────────
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  congestion:     'Congestion',
  incident:       'Incident',
  signal_failure: 'Signal Failure',
  emergency:      'Emergency',
  weather:        'Weather',
  event:          'Event',
  sensor_offline: 'Sensor Offline',
  camera_offline: 'Camera Offline',
};

// ── Corridor status ───────────────────────
export const CORRIDOR_STATUS_LABELS: Record<CorridorStatus, string> = {
  normal:    'Normal',
  congested: 'Congested',
  blocked:   'Blocked',
  emergency: 'Emergency',
  optimized: 'Optimized',
};

export const CORRIDOR_STATUS_COLORS: Record<CorridorStatus, string> = {
  normal:    'var(--status-online)',
  congested: 'var(--severity-high)',
  blocked:   'var(--severity-critical)',
  emergency: 'var(--severity-critical)',
  optimized: 'var(--severity-info)',
};

// ── Confidence level ──────────────────────
export function confidenceLevel(value: number): 'high' | 'medium' | 'low' | 'danger' {
  if (value >= 80) return 'high';
  if (value >= 60) return 'medium';
  if (value >= 40) return 'low';
  return 'danger';
}

export const CONFIDENCE_COLORS = {
  high:   'var(--confidence-high)',
  medium: 'var(--confidence-medium)',
  low:    'var(--confidence-low)',
  danger: 'var(--confidence-danger)',
} as const;

// ── Time formatting ───────────────────────
// All date functions accept Date | string | number so stale JSON strings
// from fetch/WS never cause "date.getTime is not a function".
function toDate(v: Date | string | number): Date {
  return v instanceof Date ? v : new Date(v);
}

export function formatRelativeTime(date: Date | string | number): string {
  const diff    = Date.now() - toDate(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);

  if (minutes < 1)  return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  return toDate(date).toLocaleDateString();
}

export function formatTime(date: Date | string | number): string {
  return toDate(date).toLocaleTimeString('en-KE', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatShiftDuration(shiftStart: Date | string | number): string {
  const diff    = Date.now() - toDate(shiftStart).getTime();
  const hours   = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

// ── Flow rate helpers ─────────────────────
export function flowPercent(flowRate: number, capacityRate: number): number {
  return Math.min(100, Math.round((flowRate / capacityRate) * 100));
}

export function flowSeverity(percent: number): Severity {
  if (percent >= 90) return 'critical';
  if (percent >= 75) return 'high';
  if (percent >= 55) return 'medium';
  if (percent >= 30) return 'low';
  return 'info';
}

// ── Timeline ──────────────────────────────
export const TIMELINE_SLOTS: TimelineSlot[] = ['now', '+30', '+60', '+120'];

export const TIMELINE_LABELS: Record<TimelineSlot, string> = {
  'now':  'Now',
  '+30':  '+30 min',
  '+60':  '+1 hr',
  '+120': '+2 hr',
};

// ── Class name merger (no clsx/cn needed) ─
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ── Number formatters ─────────────────────
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-KE').format(n);
}

export function formatPercent(n: number, decimals = 0): string {
  return `${n.toFixed(decimals)}%`;
}