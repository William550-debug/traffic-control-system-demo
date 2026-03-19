'use client';

import { ModeProvider } from '@/providers/mode-provider';

/**
 * Scoped ModeProvider for /operator/modes
 * WebSocketProvider is already in root layout.
 * canOverride={true} — this page IS the override surface.
 * get full override abilty without touching the underlying operator shell
 */
export default function ModesLayout({
                                        children,
                                    }: {
    children: React.ReactNode;
}) {
    return (
        <ModeProvider canOverride={true}>
            {children}
        </ModeProvider>
    );
}