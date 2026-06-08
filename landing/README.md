<div align="center">

# Calent · Landing

### The front door.

The marketing site for Calent — your schedule, simplified.

</div>

---

## Overview

A small, fast, static Next.js site: the hero, a feature bento with live mini
previews of the app, and the legal pages. Just the pitch.

## What's inside

| | |
|---|---|
| **Hero** | Headline, app icon, and a calendar preview. |
| **Bento** | Feature tiles with miniature mock-ups (month, recurring, stickies, list). |
| **Spotlight** | Animated highlight section. |
| **Footer** | Links to **Privacy** (`/privacy`) and **Terms** (`/terms`). |
| **Legal** | Standalone Privacy Policy and Terms of Service pages. |

## Tech stack

- **Next.js 16** · **React 19** (Turbopack)
- **Tailwind CSS 4**
- **Motion** — animation
- **lucide-react** — icons

No environment variables required — it's a static marketing site.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # start the dev server (Turbopack)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

## Project structure

```
landing/
├── app/
│   ├── components/
│   │   └── landing/      → Hero, Bento, Spotlight, Nav, Footer, Confetti
│   │       └── mocks/    → mini app previews (month, list, stickies, recurring)
│   ├── privacy/          → Privacy Policy page
│   ├── terms/            → Terms of Service page
│   └── page.tsx          → home
└── theme.ts              → shared brand palette
```

The brand palette (salmon, mint, lavender, pink, butter, blue, orange) lives in
`app/components/landing/theme.ts`.

---

<div align="center">
<sub>Part of <a href="../README.md">Calent</a> · see also the <a href="../calendar/README.md">app</a>.</sub>
</div>
