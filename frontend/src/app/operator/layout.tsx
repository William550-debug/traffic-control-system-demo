import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Operator Workstation — Command Center',
};

export const dynamic = 'force-dynamic';

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                width: '100vw',
                height: '100dvh',
                overflow: 'hidden',
                background: 'var(--bg-void)',
            }}
        >
            {children}
        </div>
    );
}