import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Situation Wall — Command Center',
};

export const dynamic = 'force-dynamic';

export default function WallLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="wall-root"
            style={{
                width: '100vw',
                height: '100dvh',
                overflow: 'hidden',
                background: 'var(--bg-void)',
                pointerEvents: 'none',
                userSelect: 'none',
            }}
        >
            {children}
        </div>
    );
}