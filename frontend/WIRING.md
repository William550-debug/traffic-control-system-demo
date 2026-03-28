# Alert Aging + Cross-Agency Claim — Wiring Guide

Two new features built. Each needs ~10 lines wired into existing files.
No existing logic is replaced — all additions are additive.

---

## 1. Alert Aging (`use-alert-aging.ts`)

### Wire into `use-alertRouter.ts`

```ts
// Add import at top
import { useAlertAging } from '@/hooks/use-alert-aging';

// Inside useAlerts(), after the existing useState declarations:
// Add a setAlerts wrapper that useAlertAging can call
const setAlertsForAging = useCallback(
  (fn: (prev: Alert[]) => Alert[]) => setAlerts(fn),
  []
);

// Add this line after all the useWsEvent hooks, before the return:
useAlertAging(alerts, setAlertsForAging);
```

That's it. The hook runs on a 60s interval automatically.

---

### Show age state on AlertCard

In `src/components/alerts/alert-card.tsx`, add `AgeClock` to the top row:

```tsx
// Add import
import { AgeClock } from '@/components/alerts/claim-banner';

// In the top row div (where timeLeft and formatRelativeTime are rendered),
// add AgeClock next to the time:
<AgeClock alert={alert} />
```

---

## 2. Cross-Agency Claim (`use-alert-claim.ts` + `claim-banner.tsx`)

### Wire into `use-alertRouter.ts`

Add two handlers so `useAlertClaim` can update local state:

```ts
// Add import
import { useAlertClaim } from '@/hooks/use-alert-claim';

// Inside useAlerts(), add these two callbacks:
const handleClaim = useCallback((alertId: string, agency: Agency) => {
  setAlerts(prev => prev.map(a =>
    a.id === alertId ? { ...a, claimedBy: agency, updatedAt: new Date() } : a
  ));
}, []);

const handleRelease = useCallback((alertId: string) => {
  setAlerts(prev => prev.map(a =>
    a.id === alertId ? { ...a, claimedBy: undefined, updatedAt: new Date() } : a
  ));
}, []);

// Instantiate the hook:
const { claimAlert, releaseAlert, isClaiming, isReleasing } =
  useAlertClaim(handleClaim, handleRelease);

// Add to the return object:
return {
  ...existing,
  claimAlert,
  releaseAlert,
  isClaiming,
  isReleasing,
};
```

Also add to `AlertsState` interface:
```ts
claimAlert:   (id: string) => Promise<void>;
releaseAlert: (id: string) => Promise<void>;
isClaiming:   (id: string) => boolean;
isReleasing:  (id: string) => boolean;
```

---

### Wire into `AlertCard`

```tsx
// Add imports
import { ClaimBanner, ClaimButton } from '@/components/alerts/claim-banner';

// Add props to AlertCardProps:
onClaim?:     (id: string) => void;
onRelease?:   (id: string) => void;
isClaiming?:  boolean;
isReleasing?: boolean;

// Add ClaimBanner just above the quick actions div:
{alert.claimedBy && (
  <div className="mb-[6px]">
    <ClaimBanner
      alert={alert}
      onRelease={id => onRelease?.(id)}
      onClaim={id => onClaim?.(id)}
      isReleasing={isReleasing ?? false}
      isClaiming={isClaiming ?? false}
      variant="card"
    />
  </div>
)}

// Add ClaimButton inside the quick actions div (after the Escalate button):
{onClaim && (
  <ClaimButton
    alert={alert}
    onClaim={onClaim}
    isClaiming={isClaiming ?? false}
    variant="card"
  />
)}
```

---

### Wire into `AlertDrawer`

```tsx
// Add imports
import { ClaimBanner, ClaimButton } from '@/components/alerts/claim-banner';

// Add props to AlertDrawerProps:
onClaim?:     (id: string) => void;
onRelease?:   (id: string) => void;
isClaiming?:  boolean;
isReleasing?: boolean;

// In the scrollable body, add ClaimBanner after the description section:
{alert.claimedBy && (
  <ClaimBanner
    alert={alert}
    onRelease={id => onRelease?.(id)}
    onClaim={id => onClaim?.(id)}
    isReleasing={isReleasing ?? false}
    isClaiming={isClaiming ?? false}
    variant="drawer"
  />
)}

// In the footer action row, add ClaimButton:
{onClaim && !alert.claimedBy && (
  <ClaimButton alert={alert} onClaim={onClaim} isClaiming={isClaiming ?? false} variant="drawer" />
)}
```

---

### Wire into `OperatorShell` + `AlertDashboardPage`

In both files, destructure the new fields from `useAlerts()`:

```ts
const {
  alerts, pendingActions,
  acknowledgeAlert, ignoreAlert, escalateAlert, dispatchAlert,
  claimAlert, releaseAlert, isClaiming, isReleasing,  // ← add these
} = useAlerts();
```

Pass them down to `AlertCard`, `AlertPanel`, `AlertDrawer`:
```tsx
<AlertCard
  ...existing props...
  onClaim={claimAlert}
  onRelease={releaseAlert}
  isClaiming={isClaiming(alert.id)}
  isReleasing={isReleasing(alert.id)}
/>

<AlertDrawer
  ...existing props...
  onClaim={claimAlert}
  onRelease={releaseAlert}
  isClaiming={drawerAlert ? isClaiming(drawerAlert.id) : false}
  isReleasing={drawerAlert ? isReleasing(drawerAlert.id) : false}
/>
```

---

## API route: `/api/alerts` PATCH

The existing route already handles `action: 'acknowledge' | 'ignore' | 'escalate' | 'resolve'`.
Add two new actions:

```ts
case 'claim':
  // Set alert.claimedBy = body.agency, alert.assignedAgency = body.agency
  break;
case 'release':
  // Clear alert.claimedBy, alert.assignedAgency
  break;
```

---

## Summary

| File to edit | Change |
|---|---|
| `src/hooks/use-alertRouter.ts` | Add `useAlertAging` call + `useAlertClaim` + expose 4 new fields |
| `src/components/alerts/alert-card.tsx` | Add `ClaimBanner`, `ClaimButton`, `AgeClock` |
| `src/components/alerts/alert-drawer.tsx` | Add `ClaimBanner`, `ClaimButton` |
| `src/components/layout/operator-shell.tsx` | Destructure + pass new props |
| `src/app/operator/alerts/page.tsx` | Destructure + pass new props |
| `src/app/api/alerts/route.ts` | Add `claim`/`release` action handlers |