<div align="center">

# Calent

### Your schedule, simplified.

A simple calendar that helps you keep track of life without getting in the way.

</div>

---

## What is Calent?

Calent is a calendar that does less, on purpose. No clutter, no gimmicks — just a
clean place to see your week, jot things down, and move on with your day.

Type the way you think:

```
lunch with Sam tomorrow at noon
```

Calent reads the date and time out of plain text and drops the event on your
calendar. That's the whole idea.

## Features

| | |
|---|---|
| **Natural-language entry** | Type "dentist friday 3pm" and Calent figures out the rest. |
| **Notes beside your week** | Sticky notes and checklists, right where your schedule already is. |
| **Plan further ahead** | Zoom out to the full month to spot busy stretches before they sneak up. |
| **What's next, first** | A clean, chronological feed of everything coming up. |
| **Recurring events** | Daily, weekly, custom — without the configuration headache. |
| **Simple, by design** | Everything you need. Nothing you don't. |

## Project structure

```
caly/
├── calendar/   → the app itself (Next.js)
└── landing/    → the marketing site
```

## Getting started

Each app runs on its own. Pick one:

```bash
# the calendar app
cd calendar
npm install
npm run dev

# or the landing site
cd landing
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The calendar app needs Supabase credentials. Add them to `calendar/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Built with

- **Next.js 16** &middot; **React 19** — framework
- **Tailwind CSS 4** — styling
- **Supabase** — auth & data
- **chrono-node** — natural-language date parsing
- **Motion** — animation

## Scripts

Run inside `calendar/` or `landing/`:

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # lint
npm run test     # run tests (calendar only)
```

---

<div align="center">
<sub>Calent — keep track of life without getting in the way.</sub>
</div>
