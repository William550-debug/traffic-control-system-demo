import { z } from 'zod';
// ─── USER STORE ─────────────────────────────────────────────────────────────
// Note: In production, move this to a database service.
const USERS = {
    'traffic-01': {
        id: 'traffic-01', name: 'Lucy Njeri', initials: 'LN',
        role: 'traffic_operator', agency: 'traffic',
        shiftStart: new Date(), pin: '1234',
        permissions: ['approve_signal', 'activate_corridor'],
    },
    'emergency-01': {
        id: 'emergency-01', name: 'William Macharia', initials: 'WM',
        role: 'emergency_coordinator', agency: 'emergency',
        shiftStart: new Date(), pin: '5678',
        permissions: ['approve_signal', 'activate_corridor', 'dispatch_unit', 'override_emergency'],
    },
    'supervisor-01': {
        id: 'supervisor-01', name: 'John Doe', initials: 'JD',
        role: 'supervisor', agency: 'traffic',
        shiftStart: new Date(), pin: '0000',
        permissions: ['approve_signal', 'activate_corridor', 'dispatch_unit',
            'override_emergency', 'view_planning', 'manage_transport'],
    },
};
// ─── HANDLERS ────────────────────────────────────────────────────────────────
export const login = (req, res) => {
    const parse = z.object({
        userId: z.string().min(1),
        pin: z.string().min(4).max(8),
    }).safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ ok: false, error: 'userId and pin are required' });
    }
    const { userId, pin } = parse.data;
    const record = USERS[userId];
    if (!record || record.pin !== pin) {
        return res.status(401).json({
            ok: false,
            error: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS'
        });
    }
    const { pin: _pin, ...user } = record;
    user.shiftStart = new Date();
    const token = process.env.API_SECRET ?? 'atms-dev-secret-2026';
    res.json({ ok: true, data: { user, token } });
};
export const logout = (_req, res) => {
    res.json({ ok: true, message: 'Logged out' });
};
export const getMe = (req, res) => {
    // Explicitly cast to string to avoid TS2345/TS2322
    const operatorId = req.headers['x-operator-id'];
    if (!operatorId) {
        return res.status(401).json({ ok: false, error: 'Missing X-Operator-Id header' });
    }
    const record = Object.values(USERS).find(u => u.id === operatorId || u.name === operatorId);
    if (!record) {
        return res.status(404).json({ ok: false, error: 'User not found' });
    }
    const { pin: _pin, ...user } = record;
    res.json({ ok: true, data: { user } });
};
//# sourceMappingURL=authController.js.map