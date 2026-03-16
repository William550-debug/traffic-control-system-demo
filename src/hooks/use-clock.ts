'use client';

import { useState, useEffect } from 'react';

interface ClockState {
    time:    string;   // HH:MM:SS
    date:    string;   // Mon 10 Mar 2026
    seconds: number;   // raw seconds for animations
}

// Empty state rendered on the server — avoids SSR/CSR time mismatch
const EMPTY: ClockState = { time: '--:--:--', date: '---', seconds: 0 };

function getClockState(): ClockState {
    const now = new Date();
    return {
        time: now.toLocaleTimeString('en-KE', {
            hour:   '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }),
        date: now.toLocaleDateString('en-KE', {
            weekday: 'short',
            day:     'numeric',
            month:   'short',
            year:    'numeric',
        }),
        seconds: now.getSeconds(),
    };
}

export function useClock(): ClockState {
    // Start with empty placeholder — server and first client render agree
    const [state, setState] = useState<ClockState>(EMPTY);
    const [mounted, setMounted] = useState(false);

    // After mount, populate immediately then tick every second
    useEffect(() => {
        setMounted(true);
        setState(getClockState());
        const id = setInterval(() => setState(getClockState()), 1000);
        return () => clearInterval(id);
    }, []);

    return mounted ? state : EMPTY;
}