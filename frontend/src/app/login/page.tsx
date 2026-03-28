'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    useAuth,
    LOGIN_USERS, // Changed from MOCK_USERS
    ROLE_LABELS,
    AGENCY_LABELS,
    AGENCY_COLORS
} from '@/providers/auth-provider';
import type { User , Agency} from '@/types';


const USERS = LOGIN_USERS;

export default function LoginPage() {
    const router       = useRouter();
    const searchParams = useSearchParams();
    const { user, login, isLoading } = useAuth();

    const [selected, setSelected] = useState<User | null>(null);
    const [pin, setPin]           = useState('');
    const [error, setError]       = useState('');
    const [shake, setShake]       = useState(false);
    const [success, setSuccess]   = useState(false);
    const [mounted, setMounted]   = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Redirect logic
    useEffect(() => {
        if (!mounted) return;
        if (user) {
            const from = searchParams.get('from') ?? '/operator';
            const safePath = from.startsWith('/') ? from : '/operator';
            router.replace(safePath);
        }
    }, [user, mounted, router, searchParams]);

    const handleSelectUser = (u: User) => {
        setSelected(u);
        setPin('');
        setError('');
    };

    // performLogin must be stabilized with useCallback to satisfy exhaustive-deps
    const performLogin = useCallback(async (finalPin: string) => {
        if (!selected) return;

        const isSuccess = await login(selected.id, finalPin);

        if (isSuccess) {
            setSuccess(true);
        } else {
            setShake(true);
            setTimeout(() => {
                setPin('');
                setShake(false);
            }, 600);
        }
    }, [selected, login]);

    const handlePin = useCallback(async (digit: string) => {
        if (pin.length >= 4 || success) return;

        const nextPin = pin + digit;
        setPin(nextPin);

        if (nextPin.length === 4) {
            void performLogin(nextPin);
        }
    }, [pin, success, performLogin]); // Added performLogin as a dependency

    const handleBackspace = () => {
        setPin(p => p.slice(0, -1));
        setError('');
    };

    const handleBack = () => {
        setSelected(null);
        setPin('');
        setError('');
    };

    if (!mounted) return null;

    return (
        <div style={{
            width: '100vw', height: '100dvh',
            background: 'var(--bg-void)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
        }}>

            {/* Background grid */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `
          linear-gradient(rgba(59,158,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,158,255,0.04) 1px, transparent 1px)
        `,
                backgroundSize: '48px 48px',
                maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
            }} />

            {/* Scan line */}
            <div style={{
                position: 'absolute', left: 0, right: 0, height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(59,158,255,0.3), transparent)',
                animation: 'scan-line 6s linear infinite', pointerEvents: 'none',
            }} />

            {/* Corner accents */}
            {[
                { top: 20, left: 20 }, { top: 20, right: 20 },
                { bottom: 20, left: 20 }, { bottom: 20, right: 20 },
            ].map((pos, i) => (
                <div key={i} style={{
                    position: 'absolute', width: 24, height: 24,
                    borderTop:    i < 2  ? '1px solid rgba(59,158,255,0.3)' : 'none',
                    borderBottom: i >= 2 ? '1px solid rgba(59,158,255,0.3)' : 'none',
                    borderLeft:   i % 2 === 0 ? '1px solid rgba(59,158,255,0.3)' : 'none',
                    borderRight:  i % 2 === 1 ? '1px solid rgba(59,158,255,0.3)' : 'none',
                    ...pos,
                }} />
            ))}

            {/* Header */}
            <div style={{
                position: 'absolute', top: 32, textAlign: 'center',
                animation: 'fade-in 600ms ease both',
            }}>
                <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                    letterSpacing: '0.25em', color: 'var(--accent-primary)',
                    textTransform: 'uppercase', marginBottom: 6, opacity: 0.7,
                }}>
                    Nairobi Metropolitan Transport Authority
                </div>
                <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '1.1rem',
                    fontWeight: 700, letterSpacing: '0.06em',
                    color: 'var(--text-primary)', textTransform: 'uppercase',
                }}>
                    Traffic Command Center
                </div>
            </div>

            {/* Main card */}
            <div style={{ width: '100%', maxWidth: 480, padding: '0 24px', animation: 'slide-in-up 400ms ease both' }}>

                {!selected ? (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 28 }}>
                            <div style={{
                                fontFamily: 'var(--font-display)', fontSize: '0.85rem',
                                fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6,
                            }}>
                                Select your profile
                            </div>
                            <div style={{
                                fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                                color: 'var(--text-muted)', letterSpacing: '0.06em',
                            }}>
                                Authorised personnel only
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {USERS.map((u, i) => {
                                const agencyColor = AGENCY_COLORS[u.agency];
                                return (
                                    <button
                                        key={u.id}
                                        onClick={() => handleSelectUser(u)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 14,
                                            padding: '14px 16px', background: 'var(--bg-raised)',
                                            border: `1px solid var(--border-default)`,
                                            borderLeft: `3px solid ${agencyColor}`,
                                            borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                                            transition: 'all 180ms ease',
                                            animation: `slide-in-up 300ms ease ${i * 60}ms both`,
                                            outline: 'none',
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                                            (e.currentTarget as HTMLElement).style.borderColor = agencyColor + '60';
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                                        }}
                                    >
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '50%',
                                            background: `${agencyColor}20`, border: `1px solid ${agencyColor}40`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, fontFamily: 'var(--font-display)',
                                            fontSize: '0.75rem', fontWeight: 700, color: agencyColor,
                                        }}>
                                            {u.initials}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontFamily: 'var(--font-display)', fontSize: '0.82rem',
                                                fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3,
                                            }}>
                                                {u.name}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: agencyColor, background: `${agencyColor}15`,
                            padding: '1px 6px', borderRadius: 3,
                        }}>
                          {AGENCY_LABELS[u.agency]}
                        </span>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                          {ROLE_LABELS[u.role]}
                        </span>
                                            </div>
                                        </div>
                                        <span style={{ color: 'var(--text-disabled)', fontSize: '0.9rem', flexShrink: 0 }}>›</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                ) : (
                    <div style={{ animation: 'slide-in-up 250ms ease both' }}>

                        {/* Back + user header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <button
                                onClick={handleBack}
                                style={{
                                    padding: '5px 10px', background: 'var(--bg-raised)',
                                    border: '1px solid var(--border-default)', borderRadius: 6,
                                    cursor: 'pointer', fontFamily: 'var(--font-mono)',
                                    fontSize: '0.6rem', color: 'var(--text-muted)',
                                    outline: 'none', transition: 'all 150ms ease', flexShrink: 0,
                                }}
                            >
                                ← Back
                            </button>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    background: `${AGENCY_COLORS[selected.agency]}20`,
                                    border: `1px solid ${AGENCY_COLORS[selected.agency]}50`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, fontFamily: 'var(--font-display)',
                                    fontSize: '0.65rem', fontWeight: 700, color: AGENCY_COLORS[selected.agency],
                                }}>
                                    {selected.initials}
                                </div>
                                <div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {selected.name}
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                                        {ROLE_LABELS[selected.role]}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PIN dots */}
                        <div style={{ textAlign: 'center', marginBottom: 6 }}>
                            <div style={{
                                fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                                letterSpacing: '0.1em', color: 'var(--text-muted)',
                                textTransform: 'uppercase', marginBottom: 16,
                            }}>
                                Enter PIN
                            </div>

                            <div style={{
                                display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 12,
                                animation: shake ? 'shake 0.5s ease' : 'none',
                            }}>
                                {[0,1,2,3].map(i => {
                                    const filled = i < pin.length;
                                    const color  = success ? 'var(--status-online)'
                                        : error   ? 'var(--severity-critical)'
                                            : AGENCY_COLORS[selected.agency];
                                    return (
                                        <div key={i} style={{
                                            width: 14, height: 14, borderRadius: '50%',
                                            background:  filled ? color : 'transparent',
                                            border:      `2px solid ${filled ? color : 'var(--border-strong)'}`,
                                            transition:  'all 150ms ease',
                                            boxShadow:   filled ? `0 0 8px ${color}60` : 'none',
                                        }} />
                                    );
                                })}
                            </div>

                            {error && (
                                <div style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                                    color: 'var(--severity-critical)', marginBottom: 8,
                                    animation: 'fade-in 200ms ease',
                                }}>
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                                    color: 'var(--status-online)', marginBottom: 8,
                                    animation: 'fade-in 200ms ease',
                                }}>
                                    Access granted — loading…
                                </div>
                            )}
                        </div>

                        {/* PIN pad */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                            opacity: success ? 0.4 : 1,
                            pointerEvents: success ? 'none' : 'auto',
                            transition: 'opacity 300ms ease',
                        }}>
                            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => {
                                if (key === '') return <div key={i} />;
                                const isBackspace = key === '⌫';
                                return (
                                    <button
                                        key={i}
                                        onClick={() => isBackspace ? handleBackspace() : handlePin(key)}
                                        disabled={isLoading}
                                        style={{
                                            padding: '16px',
                                            background: isBackspace ? 'transparent' : 'var(--bg-raised)',
                                            border: `1px solid ${isBackspace ? 'transparent' : 'var(--border-default)'}`,
                                            borderRadius: 8, cursor: 'pointer',
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: isBackspace ? '1rem' : '1.1rem',
                                            fontWeight: 600,
                                            color: isBackspace ? 'var(--text-muted)' : 'var(--text-primary)',
                                            textAlign: 'center', transition: 'all 120ms ease', outline: 'none',
                                        }}
                                        onMouseEnter={e => {
                                            if (!isBackspace) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                                        }}
                                        onMouseLeave={e => {
                                            if (!isBackspace) (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)';
                                        }}
                                        onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)'; }}
                                        onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                                    >
                                        {key}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{
                            textAlign: 'center', marginTop: 16,
                            fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
                            color: 'var(--text-disabled)', letterSpacing: '0.06em',
                        }}>
                            Demo PINs: traffic-01 → 1234 · emergency-01 → 5678 · supervisor → 0000
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                position: 'absolute', bottom: 20,
                fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                color: 'var(--text-disabled)', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
                Secure Access · v2.4.1 · {new Date().getFullYear()}
            </div>

            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-8px); }
          30%       { transform: translateX(8px); }
          45%       { transform: translateX(-6px); }
          60%       { transform: translateX(6px); }
          75%       { transform: translateX(-3px); }
          90%       { transform: translateX(3px); }
        }
      `}</style>
        </div>
    );
}