<div align="center">

# Calent · App

### The calendar itself.

The Next.js application behind Calent — your schedule, simplified.

`#FF7264`

</div>

---

## Overview

This is the product: the week grid, the month view, sticky notes,
deadlines, and the natural-language quick-add. It talks to Supabase for auth and
storage, and runs as an installable PWA.

Type the way you think and Calent does the rest:

```
dentist friday 3pm
```

## Features

| | |
|---|---|
| **Quick add** | Natural-language event entry (`⌘K`) powered by `chrono-node`. |
| **Views** | Day / Week / Month time grids, plus a List view with schedule + notes. |
| **Sticky notes** | Notes and checklists beside your week, drag-to-reorder. |
| **Deadlines** | A due-date feed with live relative countdowns. |
| **Recurring events** | Daily, weekly, weekends, and fully custom repeat rules. |
| **Labels** | Color-code events by label (course/project). |
| **Themes** | Light, Dark, Mint, Lavender, Pink, Butter, War Eagle — plus a **Custom** theme from any accent + background color. |
| **Languages** | English + Spanish (JSON locales), with dates that localize automatically. |
| **Timezones** | Renders every time in your chosen IANA timezone. |

## Tech stack

- **Next.js 16** · **React 19** (Turbopack)
- **Tailwind CSS 4** + Base UI / shadcn primitives
- **Supabase** (`@supabase/ssr`) — auth & Postgres
- **chrono-node** — natural-language date parsing
- **Motion / Framer Motion** — animation
- **Vitest** + **Playwright** — tests
- **lucide-react** — icons

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in your Supabase project values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

`.env.local` needs your Supabase project credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
```

## Scripts

```bash
npm run dev      # start the dev server (Turbopack)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
npm run test     # vitest
```

## Project structure

```
calendar/
├── app/
│   ├── components/       → UI (TimeGrid, MonthView, EventModal, StickiesPanel, …)
│   ├── hooks/            → data stores (calendar, stickies, courses, settings)
│   ├── lib/
│   │   ├── i18n/         → translator + en/es locale JSON
│   │   ├── supabase/     → browser & server clients
│   │   ├── dateUtils.ts  → date math + timezone helpers
│   │   ├── recurrence.ts → recurring-event generation
│   │   └── themes.ts     → theme presets + custom-theme engine
│   ├── login/            → auth screen
│   └── types/            → shared types
├── components/ui/        → shadcn-style primitives
└── proxy.ts              → Supabase session middleware
```

---

<div align="center">
<sub>Part of <a href="../README.md">Calent</a> · see also the <a href="../landing/README.md">landing site</a>.</sub>
</div>
