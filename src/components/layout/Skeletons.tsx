'use client';

// ── Base skeleton block ───────────────────
function Bone({
                  w, h, radius = 4, style,
              }: {
    w?: number | string;
    h:  number;
    radius?: number;
    style?:  React.CSSProperties;
}) {
    return (
        <div
            className="skeleton"
            style={{
                width:        w ?? '100%',
                height:       h,
                borderRadius: radius,
                flexShrink:   0,
                ...style,
            }}
        />
    );
}

// ── Alert panel skeleton ──────────────────
export function AlertPanelSkeleton() {
    return (
        <div style={{
            height:        '100%',
            background:    'var(--bg-raised)',
            borderLeft:    '1px solid var(--border-default)',
            display:       'flex',
            flexDirection: 'column',
            padding:       10,
            gap:           10,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Bone w={60} h={14} />
                <Bone w={24} h={14} style={{ marginLeft: 'auto' }} />
            </div>
            {/* Severity group */}
            {[3, 2, 1].map((count, g) => (
                <div key={g}>
                    <Bone w={50} h={10} style={{ marginBottom: 6 }} />
                    {Array.from({ length: count }).map((_, i) => (
                        <Bone key={i} h={68} radius={8} style={{ marginBottom: 5 }} />
                    ))}
                </div>
            ))}
        </div>
    );
}

// ── Map skeleton ──────────────────────────
export function MapSkeleton() {
    return (
        <div style={{
            width:     '100%',
            height:    '100%',
            position:  'relative',
            overflow:  'hidden',
            background:'var(--bg-base)',
        }}>
            {/* Grid */}
            <div style={{
                position:        'absolute',
                inset:           0,
                backgroundImage: `
          linear-gradient(var(--border-subtle) 1px, transparent 1px),
          linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
        `,
                backgroundSize: '40px 40px',
            }} />

            {/* Scan line */}
            <div style={{
                position:   'absolute',
                left:       0,
                right:      0,
                height:     2,
                background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
                opacity:    0.15,
                animation:  'scan-line 3s linear infinite',
            }} />

            {/* Centred label */}
            <div style={{
                position:       'absolute',
                inset:          0,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexDirection:  'column',
                gap:            8,
            }}>
        <span className="text-op-label" style={{ color: 'var(--text-muted)' }}>
          INITIALISING MAP
        </span>
                <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width:        4,
                            height:       4,
                            borderRadius: '50%',
                            background:   'var(--accent-primary)',
                            animation:    `pulse-dot 1.2s ease ${i * 0.2}s infinite`,
                        }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Status bar skeleton ───────────────────
export function StatusBarSkeleton() {
    return (
        <div style={{
            height:     'var(--status-bar-h)',
            background: 'var(--bg-raised)',
            borderBottom:'1px solid var(--border-default)',
            display:    'flex',
            alignItems: 'center',
            padding:    '0 16px',
            gap:        12,
        }}>
            <Bone w={140} h={16} />
            <Bone w={50}  h={12} />
            <div style={{ flex: 1 }} />
            <Bone w={80}  h={12} />
            <Bone w={60}  h={12} />
            <Bone w={60}  h={12} />
            <div style={{ width: 1, height: 24, background: 'var(--border-default)' }} />
            <Bone w={100} h={28} radius={20} />
        </div>
    );
}

// ── Predictive strip skeleton ─────────────
export function PredictiveSkeleton() {
    return (
        <div style={{
            height:     '100%',
            background: 'var(--bg-raised)',
            borderTop:  '1px solid var(--border-default)',
            display:    'flex',
            alignItems: 'center',
            padding:    '0 16px',
            gap:        16,
        }}>
            <Bone w={60} h={28} radius={4} />
            <div style={{ width: 1, height: 28, background: 'var(--border-default)' }} />
            <div style={{ display: 'flex', gap: 6 }}>
                {[0,1,2,3].map(i => (
                    <Bone key={i} w={64} h={36} radius={6} />
                ))}
            </div>
            <div style={{ width: 1, height: 28, background: 'var(--border-default)' }} />
            <Bone h={24} style={{ flex: 1 }} />
        </div>
    );
}

// ── Activity feed skeleton ─────────────────
export function ActivityFeedSkeleton() {
    return (
        <div style={{
            height:        '100%',
            background:    'var(--bg-raised)',
            borderLeft:    '1px solid var(--border-default)',
            borderTop:     '1px solid var(--border-default)',
            display:       'flex',
            flexDirection: 'column',
            padding:       10,
            gap:           8,
        }}>
            <Bone w={70} h={10} style={{ marginBottom: 4 }} />
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Bone w={24} h={10} />
                    <Bone h={10} style={{ flex: 1 }} />
                    <Bone w={28} h={10} />
                </div>
            ))}
        </div>
    );
}