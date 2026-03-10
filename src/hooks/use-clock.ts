'use client';

import { useState, useEffect } from 'react';

interface ClockState {
    time: string;       // HH:MM:SS
    date: string;       // Mon 10 Mar 2026
    seconds: number;    // raw seconds for animations
}

export function useClock(): ClockState {
    const [state, setState] = useState<ClockState>(() => getClockState());

    useEffect(() => {
        const id = setInterval(() => setState(getClockState()), 1000);
        return () => clearInterval(id);
    }, []);

    return state;
}

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