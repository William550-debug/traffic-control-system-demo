# Command Center — Setup Guide

## Phase 1: Foundation ✅

All foundation files are in place. Follow these steps to wire them into your project.

---

## 1. Install dependencies

```bash
npm install
```

## 2. Copy files into your project

Replace your existing `src/app/` with the new files, and add:

```
src/
├── app/
│   ├── globals.css          ← Replace existing
│   ├── layout.tsx           ← Replace existing
│   ├── page.tsx             ← Replace existing
│   ├── wall/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── operator/
│       ├── layout.tsx
│       └── page.tsx
├── providers/
│   ├── auth-provider.tsx
│   └── websocket-provider.tsx
├── lib/
│   ├── mock-data.ts
│   └── utils.ts
└── types/
    └── backend-index.ts
```

## 3. Update tailwind.config.ts

Replace your `tailwind.config.ts` with the provided one.

## 4. Install ShadCN (Phase 4 prep)

```bash
npx shadcn@latest init
```

Choose:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

Then install components as needed in Phase 4:
```bash
npx shadcn@latest add card button badge scroll-area sheet tabs slider select
```

## 5. Run the dev server

```bash
npm run dev
```

Navigate to:
- `http://localhost:3000/operator` — Operator workstation (skeleton layout)
- `http://localhost:3000/wall` — Situation wall (skeleton layout)

---

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — Foundation      | ✅ Done    | Types, providers, CSS tokens, route structure |
| 2 — Layouts         | ⏳ Next    | StatusBar, Wall layout, Operator 60/20/15 grid |
| 3 — Map             | ⏳ Pending | Heatmap, markers, overlays, map controls |
| 4 — Alert System    | ⏳ Pending | Alert panel, cards, quick actions, side drawer |
| 5 — Predictive + AI | ⏳ Pending | Timeline slider, AI recommendation card |
| 6 — Role-Based Views| ⏳ Pending | Role guards, agency variants, action feed |
| 7 — Polish          | ⏳ Pending | Sync, accessibility, performance |

---

## Design Tokens

All colors and spacing are CSS custom properties defined in `globals.css`.
Use them directly: `var(--severity-critical)`, `var(--bg-raised)`, etc.

Tailwind classes are also mapped: `bg-raised`, `text-primary`, `text-critical`.

## Fonts

- **Syne** — Display font for headings, panel labels
- **JetBrains Mono** — Monospace for data values, timestamps, codes

Both loaded from Google Fonts in `globals.css`.