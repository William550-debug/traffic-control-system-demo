'use client';

import { ModeProvider } from '@/providers/mode-provider';

export default function AlertsLayout({
                                         children,
                                     }: {
    children: React.ReactNode;
}) {
    return (
        <ModeProvider canOverride={false}>
            {children}
        </ModeProvider>
    );
}