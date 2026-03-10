# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint (Next.js config, no separate test suite)
```

No test framework is configured. Lint is the only automated quality check.

## Architecture

This is a **multi-agency traffic management command center** built with Next.js 16 App Router + React 19. The domain is Nairobi metro traffic, modelled with agencies (traffic, emergency, transport, planning) and role-based permissions.

### Two views

| Route | Shell component | Purpose |
|---|---|---|
| `/operator` | `OperatorShell` | Interactive workstation: map + alert panel + AI recs + audit log |
| `/wall` | `WallShell` | Read-only large-screen display: map + critical events + system health |

### Provider tree (root layout)

`AuthProvider` → `WebSocketProvider` → page content

- **`AuthProvider`** (`src/providers/auth-provider.tsx`): Mock-user auth with role/permission helpers. No real auth backend yet — users are swapped via `login(userId)`. Default user is `'traffic-01'`.
- **`WebSocketProvider`** (`src/providers/websocket-provider.tsx`): When `MOCK_WS_URL` is `null` (dev), fires synthetic events on a 15s interval. Set `url` prop to a real `ws://` endpoint for production. Subscribe with `useWsEvent(type, handler)` or `useWebSocket().subscribe(...)`.

### Data layer

All runtime data is **mocked** (`src/lib/mock-data.ts`) — no API calls. Hooks hydrate from mock data and update in response to WS events:

- `useAlerts` — alert list, grouped/sorted by severity, acknowledge/ignore actions
- `useRecommendations` — AI recs with approve/reject/modify
- `useAuditLog` — append-only action history
- `usePredictive` — timeline snapshots (now / +30 / +60 / +120 min)
- `useSystemHealth` — IoT network %, AI confidence, uptime
- `useMap` (`src/hooks/use-map.ts`) — map viewport state and overlay toggles
- `useClock` — live clock tick

### Map

`TrafficMap` (`src/components/map/traffic-map.tsx`) initialises Leaflet imperatively in a single `useEffect` to avoid React-Leaflet SSR issues. Leaflet is dynamically imported (`await import('leaflet')`). `leaflet.heat` accesses the global `window.L` because it patches the global namespace. Dark CartoDB tiles are used. Marker icons must be served from `/public/leaflet/`.

`MapContainer` (`src/components/map/map-container.tsx`) is the React wrapper that composes `TrafficMap` + `MapControls` and owns `useMap` state.

### Design system

CSS custom properties defined in `src/app/globals.css`. Key tokens:
- `--bg-void / --bg-base / --bg-raised / --bg-elevated` — layered dark backgrounds
- `--severity-critical/high/medium/low/info` — alert severity colours
- `--font-display / --font-mono` — typography
- Emergency mode toggled via `document.documentElement.classList.toggle('emergency', ...)`, which activates a purple `.emergency` CSS scope in globals.

Components use **inline styles** throughout (not Tailwind classes) for precise control. Tailwind is available but used sparingly. `shadcn` UI primitives (`src/components/ui/`) are added as needed via `npx shadcn add <component>`.

### Type system

All domain types are in `src/types/index.ts`. The key union types to know: `Severity`, `AlertType`, `AlertStatus`, `WsEventType`, `UserRole`, `Permission`, `Agency`. Custom Leaflet type declarations are in `src/types/leaflet.d.ts` and `src/types/Leaflet.heat.d.ts`.

### Path aliases

`@/` maps to `src/` (Next.js default tsconfig paths).

### Known stubs

- `src/app/page.tsx` (home route `/`) is a placeholder — no navigation to `/operator` or `/wall` yet.
- Wall map (`WallShell`) uses a CSS placeholder, not a real Leaflet instance.
- WS backend (`MOCK_WS_URL = null`) — set to a real URL when a backend exists.