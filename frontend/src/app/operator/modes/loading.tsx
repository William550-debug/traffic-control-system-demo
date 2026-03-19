/**
 * Loading skeleton for /operator/modes
 *
 * Responsiveness fixes:
 *   – Shimmer widths use percentages or max-w instead of fixed px
 *   – px-4 sm:px-6 matches the page layout
 *   – Grid gaps and card padding match the page
 */
export default function ModesLoading() {
    return (
        <div
            className="flex flex-col h-full overflow-hidden"
            style={{ background: 'var(--bg-base)' }}
            aria-busy="true"
            aria-label="Loading mode control panel"
        >
            {/* ── Header skeleton ── */}
            <div
                className="px-4 sm:px-6 pt-5 pb-4 shrink-0 flex items-center gap-4"
                style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-raised)' }}
            >
                {/* Icon box */}
                <Shimmer w="40px" h="40px" radius="12px" className="shrink-0" />

                {/* Title + subtitle */}
                <div className="flex flex-col gap-[6px] flex-1 min-w-0">
                    <Shimmer w="clamp(120px, 35%, 180px)" h="18px" />
                    <Shimmer w="clamp(180px, 60%, 320px)" h="11px" />
                </div>

                {/* Mode badge — hidden on xs */}
                <div className="hidden sm:block shrink-0">
                    <Shimmer w="56px" h="26px" radius="8px" />
                </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-auto px-4 sm:px-6 py-5">
                <div className="flex flex-col gap-4 max-w-3xl">

                    {/* Section card template */}
                    {[
                        {
                            /* Status section */
                            body: (
                                <div className="flex flex-col gap-4">
                                    {/* Mode pill */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Shimmer w="clamp(160px, 45%, 200px)" h="56px" radius="12px" />
                                        <Shimmer w="clamp(100px, 30%, 140px)" h="36px" radius="8px" />
                                    </div>
                                    {/* Auto-transition row */}
                                    <Shimmer w="100%" h="52px" radius="12px" />
                                    {/* Override row */}
                                    <Shimmer w="100%" h="44px" radius="12px" />
                                </div>
                            ),
                        },
                        {
                            /* Threshold section */
                            body: (
                                <div className="flex flex-col gap-6">
                                    {[1, 2].map(i => (
                                        <div key={i} className="flex flex-col gap-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Shimmer w="clamp(120px, 55%, 220px)" h="13px" />
                                                <Shimmer w="72px" h="22px" radius="6px" className="ml-auto" />
                                            </div>
                                            <Shimmer w="85%" h="10px" />
                                            <Shimmer w="100%" h="8px" radius="4px" />
                                        </div>
                                    ))}

                                    {/* Divider */}
                                    <Shimmer w="100%" h="1px" />

                                    {[1, 2, 3, 4].map(i => (
                                        <Shimmer key={i} w="100%" h="52px" radius="12px" />
                                    ))}
                                </div>
                            ),
                        },
                        {
                            /* Log section */
                            body: (
                                <div
                                    className="rounded-lg overflow-hidden"
                                    style={{ border: '1px solid var(--border-subtle)' }}
                                >
                                    {/* Header row */}
                                    <div
                                        className="flex gap-4 px-4 py-3"
                                        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}
                                    >
                                        {['60px', '72px', '80px', '1fr', '80px'].map((w, i) => (
                                            <div key={i} style={{ flex: w === '1fr' ? 1 : 'none', width: w !== '1fr' ? w : undefined }}>
                                                <Shimmer w="70%" h="9px" />
                                            </div>
                                        ))}
                                    </div>
                                    {/* Data rows */}
                                    {[1, 2, 3].map(i => (
                                        <div
                                            key={i}
                                            className="flex gap-4 px-4 py-[10px]"
                                            style={{
                                                borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none',
                                                opacity:      1 - (i - 1) * 0.2,
                                            }}
                                        >
                                            <div style={{ width: '60px', flexShrink: 0 }}>
                                                <Shimmer w="100%" h="10px" className="mb-[5px]" />
                                                <Shimmer w="70%" h="8px" />
                                            </div>
                                            <div style={{ width: '72px', flexShrink: 0 }}>
                                                <Shimmer w="80%" h="18px" radius="999px" />
                                            </div>
                                            <div style={{ width: '80px', flexShrink: 0 }}>
                                                <Shimmer w="80%" h="10px" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <Shimmer w="90%" h="10px" className="mb-[5px]" />
                                                <Shimmer w="60%" h="9px" />
                                            </div>
                                            <div style={{ width: '80px', flexShrink: 0 }}>
                                                <Shimmer w="75%" h="10px" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ),
                        },
                    ].map((section, sIdx) => (
                        <div
                            key={sIdx}
                            className="rounded-xl overflow-hidden"
                            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)' }}
                        >
                            {/* Section header skeleton */}
                            <div className="flex items-center gap-3 px-4 sm:px-5 py-4">
                                <Shimmer w="32px" h="32px" radius="8px" className="shrink-0" />
                                <div className="flex flex-col gap-[6px] flex-1 min-w-0">
                                    <Shimmer w="clamp(80px, 35%, 140px)" h="13px" />
                                    <Shimmer w="clamp(120px, 55%, 220px)" h="10px" />
                                </div>
                                <Shimmer w="14px" h="14px" radius="4px" className="shrink-0" />
                            </div>

                            {/* Section body */}
                            <div
                                className="px-4 sm:px-5 pb-5 pt-5"
                                style={{ borderTop: '1px solid var(--border-subtle)' }}
                            >
                                {section.body}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Shimmer helper ───────────────────────────────────────────────────────────

function Shimmer({
                     w, h, radius = '4px', className = '',
                 }: {
    w:        string;
    h:        string;
    radius?:  string;
    className?: string;
}) {
    return (
        <div
            className={`skeleton ${className}`}
            style={{ width: w, height: h, borderRadius: radius, flexShrink: 0 }}
            aria-hidden="true"
        />
    );
}