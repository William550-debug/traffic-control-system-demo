'use client';

import {
    createContext, useContext, useState,
    useCallback, useEffect, type ReactNode,
} from 'react';
import type { User, Agency, UserRole, Permission } from '@/types';

const SESSION_KEY = 'cmd_center_user_id';
const TOKEN_KEY   = 'cmd_center_token';
const BACKEND     = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

interface AuthContextValue {
    user:          User | null;
    token:         string | null;
    isLoading:     boolean;
    error:         string | null;
    login:         (userId: string, pin: string) => Promise<boolean>;
    logout:        () => void;
    hasPermission: (permission: Permission) => boolean;
    isAgency:      (agency: Agency) => boolean;
    canManage:     (targetAgency: Agency) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user,      setUser]      = useState<User | null>(null);
    const [token,     setToken]     = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error,     setError]     = useState<string | null>(null);

    // Rehydrate session on mount
    useEffect(() => {
        const savedToken  = sessionStorage.getItem(TOKEN_KEY);
        const savedUserId = sessionStorage.getItem(SESSION_KEY);

        if (!savedToken || !savedUserId) { setIsLoading(false); return; }

        fetch(`${BACKEND}/api/auth/me`, {
            headers: {
                Authorization:   `Bearer ${savedToken}`,
                'X-Operator-Id': savedUserId,
            },
        })
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.data?.user) {
                    const u = reviveDates(data.data.user);
                    setUser(u); setToken(savedToken);
                    syncOperatorGlobal(u.name);
                } else {
                    clearSession();
                }
            })
            .catch(() => {
                // Backend unreachable — restore from cache so UI still works
                const cached = sessionStorage.getItem('cmd_center_user_cache');
                if (cached) {
                    try {
                        const u = reviveDates(JSON.parse(cached));
                        setUser(u); setToken(savedToken);
                        syncOperatorGlobal(u.name);
                    } catch { clearSession(); }
                } else { clearSession(); }
            })
            .finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = useCallback(async (userId: string, pin: string): Promise<boolean> => {
        setIsLoading(true); setError(null);
        try {
            const res = await fetch(`${BACKEND}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, pin }), // Sends both to backend
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                setError(data.error ?? 'Login failed');
                setIsLoading(false);
                return false;
            }

            const loggedInUser: User = reviveDates(data.data.user);
            const authToken: string  = data.data.token;

            setUser(loggedInUser); setToken(authToken);

            sessionStorage.setItem(SESSION_KEY,             loggedInUser.id);
            sessionStorage.setItem(TOKEN_KEY,               authToken);
            sessionStorage.setItem('cmd_center_user_cache', JSON.stringify(loggedInUser));
            document.cookie = `${SESSION_KEY}=${loggedInUser.id}; path=/; SameSite=Strict`;
            syncOperatorGlobal(loggedInUser.name);

            setIsLoading(false);
            return true;
        } catch (err) {
            console.error('[AUTH]', err);
            setError('Cannot reach authentication server');
            setIsLoading(false);
            return false;
        }
    }, []);

    const logout = useCallback(() => {
        if (token) {
            fetch(`${BACKEND}/api/auth/logout`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
        }
        clearSession(); setUser(null); setToken(null);
    }, [token]);

    const hasPermission = useCallback(
        (p: Permission) => user?.permissions.includes(p) ?? false, [user]
    );
    const isAgency  = useCallback((a: Agency) => user?.agency === a, [user]);
    const canManage = useCallback((targetAgency: Agency) => {
        if (!user) return false;
        return user.role === 'supervisor' || user.agency === targetAgency;
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, token, isLoading, error, login, logout, hasPermission, isAgency, canManage }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}

function reviveDates(user: Record<string, unknown>): User {
    return { ...user, shiftStart: user.shiftStart ? new Date(user.shiftStart as string) : new Date() } as User;
}

function clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('cmd_center_user_cache');
    document.cookie = `${SESSION_KEY}=; path=/; max-age=0; SameSite=Strict`;
}

function syncOperatorGlobal(name: string): void {
    if (typeof window !== 'undefined') {
        (window as Window & { __atmsOperator?: string }).__atmsOperator = name;
    }
}

export type { AuthContextValue };

export const ROLE_LABELS: Record<UserRole, string> = {
    traffic_operator: 'Traffic Ops', emergency_coordinator: 'Emergency',
    transport_manager: 'Transport',  planning_analyst: 'Planning', supervisor: 'Supervisor',
};
export const AGENCY_LABELS: Record<Agency, string> = {
    traffic: 'Traffic Control', emergency: 'Emergency Services',
    transport: 'Public Transport', planning: 'City Planning',
};
export const AGENCY_COLORS: Record<Agency, string> = {
    traffic: '#3b9eff', emergency: '#ff3b3b', transport: '#22c55e', planning: '#f5c518',
};

// Login page user picker — matches backend routes/authRouter.ts USERS
// providers/auth-provider.tsx

// Ensure LOGIN_USERS matches the User interface properties
export const LOGIN_USERS: User[] = [
    {
        id: 'traffic-01', name: 'Lucy Njeri', role: 'traffic_operator',
        initials: 'LN', agency: 'traffic', shiftStart: new Date(),
        permissions: ['approve_signal', 'activate_corridor']
    },
    {
        id: 'emergency-01', name: 'William Macharia', role: 'emergency_coordinator',
        initials: 'WM', agency: 'emergency', shiftStart: new Date(),
        permissions: ['dispatch_unit', 'override_emergency']
    },
    {
        id: 'supervisor-01', name: 'John Doe', role: 'supervisor',
        initials: 'JD', agency: 'traffic', shiftStart: new Date(),
        permissions: ['manage_transport', 'override_emergency']
    },
];