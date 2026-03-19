'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
    error:  Error & { digest?: string };
    reset:  () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        console.error('[CommandCenter] Unhandled error:', error);
    }, [error]);

    return (
        <div style={{
            width:          '100vw',
            height:         '100dvh',
            background:     'var(--bg-void)',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            fontFamily:     'var(--font-mono)',
            position:       'relative',
            overflow:       'hidden',
        }}>

            {/* Background grid */}
            <div style={{
                position:        'absolute',
                inset:           0,
                backgroundImage: `
          linear-gradient(rgba(255,59,59,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,59,59,0.03) 1px, transparent 1px)
        `,
                backgroundSize: '48px 48px',
                maskImage:       'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
            }} />

            <div style={{ textAlign: 'center', maxWidth: 440, padding: '0 24px', animation: 'fade-in 400ms ease both' }}>

                {/* Alert icon */}
                <div style={{
                    fontSize:     '2.5rem',
                    marginBottom: 16,
                    opacity:      0.4,
                    lineHeight:   1,
                }}>
                    ⚠
                </div>

                {/* Status badge */}
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
                        width:      6, height: 6, borderRadius: '50%',
                        background: 'var(--severity-critical)',
                    }} />
                    <span style={{
                        fontSize:      '0.6rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color:         'var(--severity-critical)',
                    }}>
            System error
          </span>
                </div>

                <div style={{
                    fontSize:      '0.8rem',
                    fontFamily:    'var(--font-display)',
                    fontWeight:    600,
                    color:         'var(--text-primary)',
                    marginBottom:  8,
                }}>
                    An unexpected error occurred
                </div>

                <div style={{
                    fontSize:      '0.62rem',
                    color:         'var(--text-muted)',
                    marginBottom:  8,
                    lineHeight:    1.6,
                }}>
                    {error.message || 'The application encountered an unrecoverable error.'}
                </div>

                {error.digest && (
                    <div style={{
                        fontSize:      '0.52rem',
                        color:         'var(--text-disabled)',
                        marginBottom:  24,
                        letterSpacing: '0.06em',
                    }}>
                        Error ID: {error.digest}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button
                        onClick={reset}
                        style={{
                            padding:       '8px 20px',
                            background:    'var(--bg-raised)',
                            border:        '1px solid var(--accent-primary)',
                            borderRadius:  7,
                            cursor:        'pointer',
                            fontSize:      '0.65rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color:         'var(--accent-primary)',
                            outline:       'none',
                            transition:    'all 150ms ease',
                        }}
                    >
                        ↺ Retry
                    </button>
                    <a href="/operator" style={{
                        padding:        '8px 20px',
                        background:     'var(--bg-raised)',
                        border:         '1px solid var(--border-default)',
                        borderRadius:   7,
                        fontSize:       '0.65rem',
                        letterSpacing:  '0.08em',
                        textTransform:  'uppercase',
                        color:          'var(--text-muted)',
                        textDecoration: 'none',
                        transition:     'all 150ms ease',
                    }}>
                        ↗ Operator
                    </a>
                </div>
            </div>
        </div>
    );
}