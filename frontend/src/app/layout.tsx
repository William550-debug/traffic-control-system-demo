import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider }      from '@/providers/auth-provider';
import { WebSocketProvider } from '@/providers/websocket-provider';
import { Toaster } from 'react-hot-toast';
export const metadata: Metadata = {
    title:       'Command Center — Traffic Management',
    description: 'Multi-agency traffic management command and control system',
    robots:      'noindex, nofollow',
};

export const viewport: Viewport = {
    width:        'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </head>
        <body>
        <AuthProvider>
            <WebSocketProvider>
                {children}
                <Toaster position="top-right" />
              
            </WebSocketProvider>
        </AuthProvider>
        </body>
        </html>
    );
}