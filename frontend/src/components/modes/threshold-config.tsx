'use client';

/**
 * ThresholdConfig — responsive rewrite
 *
 * Responsiveness fixes:
 *   – Label row uses flex-wrap so badge drops below on narrow widths
 *   – Slider range labels use clamp() fonts
 *   – Boolean toggle rows stack label+hint naturally with flex-1 min-w-0
 *   – Save/Reset row uses flex-wrap to stack on xs
 *   – All fixed font sizes replaced with clamp()
 */

import { useState, useEffect } from 'react';
import {
    Gauge,
    Brain,
    CloudRain,
    Siren,
    CalendarDays,
    AlertTriangle,
    Save,
    RotateCcw,
    CheckCircle2,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge }  from '@/components/ui/badge';
import type { ModeThresholds } from '@/types';

interface ThresholdConfigProps {
    thresholds: ModeThresholds;
    onSaved?:   (next: ModeThresholds) => void;
}

// ─── Field definitions ────────────────────────────────────────────────────────

const NUMERIC_FIELDS: {
    key:    keyof Pick<ModeThresholds, 'trafficVolume' | 'aiConfidenceMin'>;
    label:  string;
    hint:   string;
    icon:   React.ElementType;
    min:    number;
    max:    number;
    step:   number;
    unit:   string;
    danger: (v: number) => boolean;
}[] = [
    {
        key:    'trafficVolume',
        label:  'Traffic Volume Threshold',
        hint:   'Switches to Human-Validated when flow exceeds this value',
        icon:   Gauge,
        min:    500,
        max:    10_000,
        step:   500,
        unit:   'veh/h',
        danger: v => v >= 8000,
    },
    {
        key:    'aiConfidenceMin',
        label:  'Minimum AI Confidence',
        hint:   'Drops to Human-Validated when AI confidence falls below this',
        icon:   Brain,
        min:    10,
        max:    95,
        step:   5,
        unit:   '%',
        danger: v => v >= 85,
    },
];

const BOOL_FIELDS: {
    key:   keyof Pick<ModeThresholds, 'incidentActive' | 'weatherImpact' | 'eventActive' | 'emergencyActive'>;
    label: string;
    hint:  string;
    icon:  React.ElementType;
    color: string;
}[] = [
    {
        key:   'incidentActive',
        label: 'Active Incident',
        hint:  'Force Human-Validated when any incident is active',
        icon:  AlertTriangle,
        color: 'var(--severity-high)',
    },
    {
        key:   'weatherImpact',
        label: 'Weather Impact',
        hint:  'Force Human-Validated during adverse weather conditions',
        icon:  CloudRain,
        color: 'var(--severity-medium)',
    },
    {
        key:   'eventActive',
        label: 'Scheduled Event',
        hint:  'Force Human-Validated during planned city events',
        icon:  CalendarDays,
        color: 'var(--accent-primary)',
    },
    {
        key:   'emergencyActive',
        label: 'Emergency Declared',
        hint:  'Always force Human-Validated — overrides all other thresholds',
        icon:  Siren,
        color: 'var(--severity-critical)',
    },
];

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
                          checked, onChange, color = 'var(--accent-primary)',
                      }: {
    checked:  boolean;
    onChange: (v: boolean) => void;
    color?:   string;
}) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="relative shrink-0 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2"
            style={{
                width:      42,
                height:     24,
                background: checked ? color : 'var(--bg-elevated)',
                border:     `1px solid ${checked ? color : 'var(--border-strong)'}`,
                boxShadow:  checked ? `0 0 10px ${color}40` : 'none',
            }}
        >
            <span
                className="absolute top-[3px] rounded-full bg-white transition-all duration-200"
                style={{
                    width:     16,
                    height:    16,
                    left:      checked ? 'calc(100% - 19px)' : '3px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
            />
        </button>
    );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function Divider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      'clamp(0.46rem, 0.4rem + 0.14vw, 0.52rem)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         'var(--text-disabled)',
                whiteSpace:    'nowrap',
            }}>
                {label}
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ThresholdConfig({ thresholds, onSaved }: ThresholdConfigProps) {
    const [local,  setLocal]  = useState<ModeThresholds>({ ...thresholds });
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);
    const [error,  setError]  = useState<string | null>(null);

    useEffect(() => { setLocal({ ...thresholds }); }, [thresholds]);

    const isDirty = JSON.stringify(local) !== JSON.stringify(thresholds);

    const setNum  = (k: keyof ModeThresholds, v: number)  =>
        setLocal(p => ({ ...p, [k]: v }));
    const setBool = (k: keyof ModeThresholds, v: boolean) =>
        setLocal(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/modes', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ thresholds: local }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            onSaved?.(local);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setLocal({ ...thresholds });
        setError(null);
    };

    return (
        <div className="flex flex-col gap-5">

            {/* ── Numeric sliders ── */}
            <div className="flex flex-col gap-6">
                {NUMERIC_FIELDS.map(f => {
                    const val      = local[f.key] as number;
                    const isDanger = f.danger(val);
                    const Icon     = f.icon;

                    return (
                        <div key={f.key} className="flex flex-col gap-3">

                            {/* Label row — wraps on very narrow screens */}
                            <div className="flex flex-wrap items-start gap-x-2 gap-y-[5px]">
                                <div className="flex items-center gap-[7px] flex-1 min-w-0">
                                    {/* Icon */}
                                    <div
                                        className="flex items-center justify-center shrink-0 rounded-md"
                                        style={{
                                            width:      24,
                                            height:     24,
                                            background: isDanger ? 'rgba(255,136,0,0.1)' : 'var(--bg-elevated)',
                                            border:     `1px solid ${isDanger ? 'rgba(255,136,0,0.3)' : 'var(--border-subtle)'}`,
                                        }}
                                    >
                                        <Icon
                                            size={12}
                                            strokeWidth={2}
                                            style={{ color: isDanger ? 'var(--severity-high)' : 'var(--text-muted)' }}
                                        />
                                    </div>
                                    <span style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize:   'clamp(0.62rem, 0.56rem + 0.2vw, 0.72rem)',
                                        fontWeight: 600,
                                        color:      'var(--text-primary)',
                                        lineHeight: 1.2,
                                    }}>
                                        {f.label}
                                    </span>
                                </div>

                                {/* Live value badge — shrinks to own row if space is tight */}
                                <Badge
                                    variant="outline"
                                    className="h-[22px] px-[9px] tabular-nums shrink-0"
                                    style={{
                                        fontFamily:  'var(--font-mono)',
                                        fontSize:    'clamp(0.54rem, 0.48rem + 0.16vw, 0.62rem)',
                                        fontWeight:  700,
                                        background:  isDanger ? 'rgba(255,136,0,0.1)'  : 'rgba(255,255,255,0.04)',
                                        borderColor: isDanger ? 'rgba(255,136,0,0.4)'  : 'var(--border-default)',
                                        color:       isDanger ? 'var(--severity-high)' : 'var(--text-primary)',
                                    }}
                                >
                                    {val.toLocaleString()} {f.unit}
                                </Badge>
                            </div>

                            {/* Hint */}
                            <p style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   'clamp(0.5rem, 0.44rem + 0.16vw, 0.58rem)',
                                color:      'var(--text-muted)',
                                lineHeight: 1.4,
                                marginTop:  -4,
                            }}>
                                {f.hint}
                            </p>

                            {/* Slider track + range labels */}
                            <div className="px-1">
                                <Slider
                                    min={f.min}
                                    max={f.max}
                                    step={f.step}
                                    value={[val]}
                                    onValueChange={([v]) => setNum(f.key, v)}
                                    className="w-full"
                                />
                                <div className="flex justify-between mt-[6px]">
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   'clamp(0.46rem, 0.4rem + 0.14vw, 0.52rem)',
                                        color:      'var(--text-disabled)',
                                    }}>
                                        {f.min.toLocaleString()} {f.unit}
                                    </span>
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   'clamp(0.46rem, 0.4rem + 0.14vw, 0.52rem)',
                                        color:      'var(--text-disabled)',
                                    }}>
                                        {f.max.toLocaleString()} {f.unit}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Section divider ── */}
            <Divider label="Condition overrides" />

            {/* ── Boolean toggles ── */}
            <div className="flex flex-col gap-3">
                {BOOL_FIELDS.map(f => {
                    const val  = local[f.key] as boolean;
                    const Icon = f.icon;

                    return (
                        <div
                            key={f.key}
                            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200"
                            style={{
                                background: val ? `${f.color}07` : 'var(--bg-elevated)',
                                border:     `1px solid ${val ? `${f.color}25` : 'var(--border-subtle)'}`,
                            }}
                        >
                            {/* Framed icon */}
                            <div
                                className="shrink-0 rounded-lg flex items-center justify-center"
                                style={{
                                    width:      30,
                                    height:     30,
                                    background: val ? `${f.color}15` : 'var(--bg-raised)',
                                    border:     `1px solid ${val ? `${f.color}35` : 'var(--border-subtle)'}`,
                                    transition: 'all 200ms ease',
                                }}
                            >
                                <Icon
                                    size={14}
                                    strokeWidth={2}
                                    style={{
                                        color:      val ? f.color : 'var(--text-muted)',
                                        transition: 'color 200ms ease',
                                    }}
                                />
                            </div>

                            {/* Label + hint — flex-1 min-w-0 prevents overflow */}
                            <div className="flex-1 min-w-0">
                                <p style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize:   'clamp(0.62rem, 0.56rem + 0.2vw, 0.72rem)',
                                    fontWeight: 600,
                                    color:      'var(--text-primary)',
                                    lineHeight: 1,
                                    marginBottom: 3,
                                }}>
                                    {f.label}
                                </p>
                                <p style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize:   'clamp(0.5rem, 0.44rem + 0.16vw, 0.58rem)',
                                    color:      'var(--text-muted)',
                                    lineHeight: 1.35,
                                }}>
                                    {f.hint}
                                </p>
                            </div>

                            <ToggleSwitch
                                checked={val}
                                onChange={v => setBool(f.key, v)}
                                color={f.color}
                            />
                        </div>
                    );
                })}
            </div>

            {/* ── Save / Reset bar ── */}
            {(isDirty || error) && (
                <div
                    className="flex flex-wrap items-center gap-3 pt-4"
                    style={{
                        borderTop: '1px solid var(--border-subtle)',
                        animation: 'slide-in-up 150ms ease',
                    }}
                >
                    {error ? (
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.52rem, 0.46rem + 0.16vw, 0.6rem)',
                            color:      'var(--severity-critical)',
                            flex:       1,
                            minWidth:   0,
                        }}>
                            {error}
                        </span>
                    ) : (
                        <div className="flex-1" />
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        disabled={saving}
                        className="h-[32px] gap-[5px] shrink-0"
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.52rem, 0.46rem + 0.16vw, 0.6rem)',
                            color:      'var(--text-muted)',
                        }}
                    >
                        <RotateCcw size={11} strokeWidth={2} />
                        Reset
                    </Button>

                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className="h-[32px] gap-[5px] rounded-lg shrink-0 disabled:opacity-40"
                        style={{
                            fontFamily:  'var(--font-mono)',
                            fontSize:    'clamp(0.52rem, 0.46rem + 0.16vw, 0.6rem)',
                            background:  'rgba(59,158,255,0.12)',
                            border:      '1px solid rgba(59,158,255,0.35)',
                            color:       'var(--accent-primary)',
                        }}
                    >
                        <Save size={11} strokeWidth={2} />
                        {saving ? 'Saving…' : 'Save thresholds'}
                    </Button>
                </div>
            )}

            {/* ── Saved confirmation ── */}
            {saved && (
                <div
                    className="flex items-center gap-2 px-3 py-[9px] rounded-xl"
                    style={{
                        background: 'rgba(34,197,94,0.08)',
                        border:     '1px solid rgba(34,197,94,0.22)',
                        color:      'var(--status-online)',
                        animation:  'slide-in-up 150ms ease',
                    }}
                >
                    <CheckCircle2 size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   'clamp(0.52rem, 0.46rem + 0.16vw, 0.6rem)',
                        lineHeight: 1.3,
                    }}>
                        Thresholds saved — takes effect on next evaluation cycle
                    </span>
                </div>
            )}
        </div>
    );
}