import { Router } from 'express';
import { z } from 'zod';
const router = Router();
// ─── User store (mirrors frontend MOCK_USERS) ─────────────────────────────────
// In production: replace with DB lookup + bcrypt PIN hash comparison.
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
// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Body: { userId: string, pin: string }
// Returns: { ok: true, data: { user: User, token: string } }
//
// The token is the shared API_SECRET — in production replace with a
// per-user signed JWT: jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET)
router.post('/login', (req, res) => {
    const parse = z.object({
        userId: z.string().min(1),
        pin: z.string().min(4).max(8),
    }).safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ ok: false, error: 'userId and pin are required' });
        return;
    }
    const { userId, pin } = parse.data;
    const record = USERS[userId];
    if (!record || record.pin !== pin) {
        // Uniform error — don't reveal whether userId or PIN was wrong
        res.status(401).json({ ok: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
        return;
    }
    // Strip the PIN before returning the user object
    const { pin: _pin, ...user } = record;
    // Fresh shiftStart on each login
    user.shiftStart = new Date();
    // Token = shared API_SECRET (simple dev auth).
    // Replace with jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET)
    const token = process.env.API_SECRET ?? 'atms-dev-secret-2026';
    res.json({ ok: true, data: { user, token } });
});
// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Stateless — client just discards the token.
// Add token revocation here when moving to JWT.
router.post('/logout', (_req, res) => {
    res.json({ ok: true, message: 'Logged out' });
});
// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Validate the current token and return the user object.
// Useful for session rehydration on page load.
router.get('/me', (req, res) => {
    // Cast to string to ensure compatibility with .find()
    const operatorId = req.headers['x-operator-id'];
    if (!operatorId) {
        res.status(401).json({ ok: false, error: 'Missing X-Operator-Id header' });
        return;
    }
    // Use a strict comparison to resolve the user record
    const record = Object.values(USERS).find(u => u.id === operatorId || u.name === operatorId);
    if (!record) {
        res.status(404).json({ ok: false, error: 'User not found' });
        return;
    }
    const { pin: _pin, ...user } = record;
    res.json({ ok: true, data: { user } });
});
export default router;
//# sourceMappingURL=auth.js.map