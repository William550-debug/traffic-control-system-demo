# Two manual patches needed

## Patch 1 — types/backend-index.ts: add 'action:performed' to WsEventType

Find this line in src/types/backend-index.ts:
| 'emergency:deactivated';

Change it to:
| 'emergency:deactivated'
| 'action:performed'
| 'pong';

## Patch 2 — providers/auth-provider.tsx: set window.__atmsOperator after login

After the user object is resolved (where you call setUser or equivalent),
add these lines:

    if (typeof window !== 'undefined') {
        (window as Window & { __atmsOperator?: string }).__atmsOperator = user.name;
    }

This ensures every subsequent mutation request carries X-Operator-Id: "Fatima Nkosi"
so the backend audit log shows the correct operator name.

## Patch 3 — app/operator/incidents/page.tsx: wire the incident screen

Replace the placeholder content with:

    import IncidentManagementScreen from '@/components/incidents/incident-management-screen-v2';

    export default function IncidentsPage() {
        return <IncidentManagementScreen />;
    }

## Patch 4 — fix typo in existing folder

You have:  app/api/alerts/[id]/acknowlegde/route.ts  (missing 'd')
Rename to: app/api/alerts/[id]/acknowledge/route.ts

    mv "src/app/api/alerts/[id]/acknowlegde" "src/app/api/alerts/[id]/acknowledge"