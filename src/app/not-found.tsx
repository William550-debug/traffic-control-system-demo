import Link from 'next/link';

export default function NotFound() {
    return (
        <div style={{
            width:           '100vw',
            height:          '100dvh',
            background:      'var(--bg-void)',
            display:         'flex',
            flexDirection:   'column',
            alignItems:      'center',
            justifyContent:  'center',
            overflow:        'hidden',
            position:        'relative',
            fontFamily:      'var(--font-mono)',
        }}>

            {/* Background grid */}
            <div style={{
                position:        'absolute',
                inset:           0,
                backgroundImage: `
          linear-gradient(rgba(59,158,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,158,255,0.03) 1px, transparent 1px)
        `,
                backgroundSize: '48px 48px',
                maskImage:       'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
            }} />

            {/* Scan line */}
            <div style={{
                position:      'absolute',
                left:          0, right: 0, height: 1,
                background:    'linear-gradient(90deg, transparent, rgba(59,158,255,0.2), transparent)',
                animation:     'scan-line 8s linear infinite',
                pointerEvents: 'none',
            }} />

            {/* Corner accents */}
            {[
                { top: 20, left: 20 }, { top: 20, right: 20 },
                { bottom: 20, left: 20 }, { bottom: 20, right: 20 },
            ].map((pos, i) => (
                <div key={i} style={{
                    position:     'absolute',
                    width:        20, height: 20,
                    borderTop:    i < 2  ? '1px solid rgba(59,158,255,0.2)' : 'none',
                    borderBottom: i >= 2 ? '1px solid rgba(59,158,255,0.2)' : 'none',
                    borderLeft:   i % 2 === 0 ? '1px solid rgba(59,158,255,0.2)' : 'none',
                    borderRight:  i % 2 === 1 ? '1px solid rgba(59,158,255,0.2)' : 'none',
                    ...pos,
                }} />
            ))}

            <div style={{ textAlign: 'center', animation: 'fade-in 500ms ease both' }}>

                {/* Error code */}
                <div style={{
                    fontSize:      'clamp(4rem, 10vw, 7rem)',
                    fontWeight:    700,
                    color:         'rgba(59,158,255,0.12)',
                    letterSpacing: '0.05em',
                    lineHeight:    1,
                    marginBottom:  8,
                    userSelect:    'none',
                }}>
                    404
                </div>

                {/* Status label */}
                <div style={{
                    display:        'inline-flex',
                    alignItems:     'center',
                    gap:            8,
                    padding:        '4px 14px',
                    background:     'rgba(255,59,59,0.08)',
                    border:         '1px solid rgba(255,59,59,0.25)',
                    borderRadius:   20,
                    marginBottom:   20,
                }}>
                    <div style={{
                        width:        6, height: 6, borderRadius: '50%',
                        background:   'var(--severity-critical)',
                        animation:    'pulse-dot 1.5s ease infinite',
                    }} />
                    <span style={{
                        fontSize:      '0.6rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color:         'var(--severity-critical)',
                    }}>
            Route not found
          </span>
                </div>

                <div style={{
                    fontSize:      '0.75rem',
                    color:         'var(--text-muted)',
                    marginBottom:  6,
                    letterSpacing: '0.02em',
                }}>
                    The requested surface does not exist.
                </div>

                <div style={{
                    fontSize:      '0.6rem',
                    color:         'var(--text-disabled)',
                    marginBottom:  32,
                    letterSpacing: '0.06em',
                }}>
                    Check the URL or return to a known surface.
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href="/operator" style={{
                        padding:       '8px 20px',
                        background:    'var(--bg-raised)',
                        border:        '1px solid var(--border-default)',
                        borderRadius:  7,
                        fontSize:      '0.65rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color:         'var(--accent-primary)',
                        textDecoration:'none',
                        transition:    'all 150ms ease',
                    }}>
                        ↗ Operator
                    </Link>
                    <Link href="/wall" style={{
                        padding:       '8px 20px',
                        background:    'var(--bg-raised)',
                        border:        '1px solid var(--border-default)',
                        borderRadius:  7,
                        fontSize:      '0.65rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color:         'var(--text-muted)',
                        textDecoration:'none',
                        transition:    'all 150ms ease',
                    }}>
                        ↗ Wall
                    </Link>
                    <Link href="/login" style={{
                        padding:       '8px 20px',
                        background:    'var(--bg-raised)',
                        border:        '1px solid var(--border-default)',
                        borderRadius:  7,
                        fontSize:      '0.65rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color:         'var(--text-muted)',
                        textDecoration:'none',
                        transition:    'all 150ms ease',
                    }}>
                        ↗ Login
                    </Link>
                </div>
            </div>
        </div>
    );
}