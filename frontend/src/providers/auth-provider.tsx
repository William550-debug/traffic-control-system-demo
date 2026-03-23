'use client';

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from 'react';
import type { User, Agency, UserRole, Permission } from '@/types';

const SESSION_KEY = 'cmd_center_user_id';

// ── Mock users ────────────────────────────
const MOCK_USERS: Record<string, User> = {
    'traffic-01': {
        id: 'traffic-01',
        name: 'Lucy Njeri',
        initials: 'AO',
        role: 'traffic_operator',
        agency: 'traffic',
        shiftStart: new Date(Date.now() - 2 * 60 * 60 * 1000),
        permissions: ['approve_signal', 'activate_corridor'],
    },
    'emergency-01': {
        id: 'emergency-01',
        name: 'William Macharia',
        initials: 'DK',
        role: 'emergency_coordinator',
        agency: 'emergency',
        shiftStart: new Date(Date.now() - 4 * 60 * 60 * 1000),
        permissions: ['approve_signal', 'activate_corridor', 'dispatch_unit', 'override_emergency'],
    },
    'supervisor-01': {
        id: 'supervisor-01',
        name: 'John Doe',
        initials: 'FN',
        role: 'supervisor',
        agency: 'traffic',
        shiftStart: new Date(Date.now() - 6 * 60 * 60 * 1000),
        permissions: [
            'approve_signal', 'activate_corridor', 'dispatch_unit',
            'override_emergency', 'view_planning', 'manage_transport',
        ],
    },
};

// ── Context ───────────────────────────────
interface AuthContextValue {
    user:          User | null;
    isLoading:     boolean;
    login:         (userId: string) => void;
    logout:        () => void;
    hasPermission: (permission: Permission) => boolean;
    isAgency:      (agency: Agency) => boolean;
    canManage:     (targetAgency: Agency) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    // Rehydrate from sessionStorage on first render
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window === 'undefined') return null;
        const saved = sessionStorage.getItem(SESSION_KEY);
        return saved ? (MOCK_USERS[saved] ?? null) : null;
    });
    const [isLoading, setIsLoading] = useState(false);

    const login = useCallback((userId: string) => {
        setIsLoading(true);
        setTimeout(() => {
            const u = MOCK_USERS[userId] ?? null;
            const freshUser = u ? { ...u, shiftStart: new Date() } : null;
            setUser(freshUser);
            if (freshUser) {
                sessionStorage.setItem(SESSION_KEY, userId);
                // Mirror to cookie so middleware can read it (session-scoped, no expiry = tab cookie)
                document.cookie = `${SESSION_KEY}=${userId}; path=/; SameSite=Strict`;
            }
            setIsLoading(false);
        }, 600);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        sessionStorage.removeItem(SESSION_KEY);
        // Clear cookie
        document.cookie = `${SESSION_KEY}=; path=/; max-age=0; SameSite=Strict`;
    }, []);

    const hasPermission = useCallback(
        (permission: Permission) => user?.permissions.includes(permission) ?? false,
        [user]
    );

    const isAgency = useCallback(
        (agency: Agency) => user?.agency === agency,
        [user]
    );

    const canManage = useCallback(
        (targetAgency: Agency) => {
            if (!user) return false;
            if (user.role === 'supervisor') return true;
            return user.agency === targetAgency;
        },
        [user]
    );

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission, isAgency, canManage }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}

// ── Helpers ───────────────────────────────
export const MOCK_USER_IDS = Object.keys(MOCK_USERS);

export const ROLE_LABELS: Record<UserRole, string> = {
    traffic_operator:      'Traffic Ops',
    emergency_coordinator: 'Emergency',
    transport_manager:     'Transport',
    planning_analyst:      'Planning',
    supervisor:            'Supervisor',
};

export const AGENCY_LABELS: Record<Agency, string> = {
    traffic:   'Traffic Control',
    emergency: 'Emergency Services',
    transport: 'Public Transport',
    planning:  'City Planning',
};

export const AGENCY_COLORS: Record<Agency, string> = {
    traffic:   '#3b9eff',
    emergency: '#ff3b3b',
    transport: '#22c55e',
    planning:  '#f5c518',
};

// Expose mock users for the login page
export { MOCK_USERS };