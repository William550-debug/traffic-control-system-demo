/**
 * Loading skeleton for /operator/alerts
 * Matches the full-grid shimmer pattern from operator/loading.tsx
 */

export default function AlertDashboardLoading() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "var(--color-surface, #0d1117)",
                overflow: "hidden",
            }}
            aria-busy="true"
            aria-label="Loading alert dashboard"
        >
            {/* Header skeleton */}
            <div style={{ padding: "20px 24px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                    <Shimmer width="180px" height="22px" />
                    <Shimmer width="60px" height="16px" />
                </div>
                <Shimmer width="320px" height="14px" style={{ marginBottom: "20px" }} />

                {/* Tab bar skeleton */}
                <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid var(--color-border)", paddingBottom: "1px" }}>
                    <Shimmer width="100px" height="40px" radius="0" />
                    <Shimmer width="100px" height="40px" radius="0" />
                </div>
            </div>

            {/* Filter row skeleton */}
            <div
                style={{
                    display: "flex",
                    gap: "12px",
                    padding: "12px 24px",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <Shimmer width="140px" height="28px" />
                <Shimmer width="120px" height="28px" />
                <Shimmer width="100px" height="28px" />
            </div>

            {/* Alert rows skeleton */}
            <div style={{ flex: 1, padding: "12px 24px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            borderRadius: "8px",
                            overflow: "hidden",
                            opacity: 1 - i * 0.12,
                        }}
                    >
                        <Shimmer width="100%" height="104px" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Shimmer primitive ────────────────────────────────────────────────────────

function Shimmer({
                     width,
                     height,
                     radius = "6px",
                     style,
                 }: {
    width: string;
    height: string;
    radius?: string;
    style?: React.CSSProperties;
}) {
    return (
        <div
            style={{
                width,
                height,
                borderRadius: radius,
                background:
                    "linear-gradient(90deg, var(--color-surface-raised, rgba(255,255,255,0.04)) 25%, rgba(255,255,255,0.08) 50%, var(--color-surface-raised, rgba(255,255,255,0.04)) 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.6s ease-in-out infinite",
                flexShrink: 0,
                ...style,
            }}
            aria-hidden="true"
        />
    );
}