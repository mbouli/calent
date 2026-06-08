# Landing Page: Spotlight + Pricing Sections

## Design Read
Consumer SaaS landing (student audience), redesign-preserve mode. Matches existing palette: salmon `#FF7264`, ink `#0D0D0D`, offWhite `#F9F8F6`, mint/lavender/butter accents, Geist font, 2xl radius system, `motion/react` Reveal scroll animations.

**Dials:** VARIANCE 7 / MOTION 5 / DENSITY 4

---

## Sections to Add

Both sections insert between the existing Bento grid and the Footer in `app/components/LandingPage.tsx`.

---

## Section 1: Spotlight Feature Highlight

**Position:** Immediately after `{/* BENTO FEATURES */}` section, before footer.

**Layout:** Split — left copy, right command bar mockup. `offWhite` (#F9F8F6) background, `border-radius: 18px`, padding `52px 48px`. Max-width matches bento (`max-w-[1100px]`). Wrapped in `<Reveal>` for scroll animation.

**Left column (flex: 0 0 300px):**
- Eyebrow pill: ink background, white text, `⌘K anywhere` label with `<kbd>` styling
- Headline: `"Type your day."` + line break + `"Calent does the rest."` — second line in salmon
- Body: `"No forms. No dropdowns. Just describe what you need and your event lands on the calendar with a tap to confirm."` — ink at 45% opacity

**Right column (flex: 1):**
- Command bar card: white bg, ink shadow, 14px radius, shows `"gym tomorrow 6pm"` with blinking salmon cursor
- Preview card below it: white bg, same shadow/radius — shows title "Gym", time "Tomorrow · 18:00–19:00", "Add to calendar" button (ink bg, white text) + "Edit" button (transparent, ink border), hint text with `↵` and `Esc` kbd tags

**Colors:** offWhite bg, ink pill, salmon accent text, white cards with `rgba(13,13,13,0.07)` border and `0 8px 32px rgba(13,13,13,0.08)` shadow.

---

## Section 2: Pricing Cards

**Position:** After Spotlight section, before footer.

**Layout:** White background container, `border-radius: 18px`, `border: 1px solid rgba(13,13,13,0.07)`. Inner `max-w-[1100px]`. Centered heading, 2-column card grid below. Wrapped in `<Reveal>`.

**Heading:** `"Simple pricing."` (26px, semibold, ink) + subtitle `"Start free. Upgrade when you're ready."` (ink 40% opacity).

**Free card** (white bg, `rgba(13,13,13,0.09)` border):
- Label: "Free" (11px uppercase, ink 35% opacity)
- Price: `$0` + `/forever` subtext (ink 35% opacity)
- Divider
- Features (◆ check marks at ink 25% opacity):
  - Week, day & month views
  - Google Calendar sync
  - Recurring events
  - Stickies & checklists
  - Deadlines & course colours
  - Themes & mobile-friendly
- CTA: "Get started free" (ink 6% bg, ink text)

**Plus card** (ink `#0D0D0D` bg):
- Badge: salmon pill "PLUS"
- Price: `$5` + `/month` subtext (white 35% opacity)
- Alt text: `or $48/year` + `save 20%` in salmon
- Divider (white 10% opacity)
- Features (◆ check marks in salmon):
  - Everything in Free (white 55% opacity)
  - Personalise themes, spacing & typography (white 88% opacity)
  - Add events by typing plain English (white 88% opacity)
  - Paste your syllabus, get your deadlines automatically (white 88% opacity)
- CTA: "Start Plus" (salmon bg, ink text)

**No em-dashes.** "save 20%" uses plain text.

---

## Implementation Notes

- Both sections use the existing `<Reveal>` component (already in LandingPage.tsx)
- Import nothing new — no additional dependencies
- All mock UI (command bar, preview card) is pure inline JSX with inline styles, matching the existing MiniCalendarPreview / MiniStickiesMock pattern
- Mobile: both sections collapse to single-column at `< 768px`, spotlight command bar mockup hides on mobile (too small to be legible)
- `motion/react` is already imported; no new imports needed
- The blinking cursor is a CSS animation defined in `globals.css` or as an inline `<style>` tag... actually since this is a React component, use a CSS class or inline keyframe via a `<style>` tag inside the component (matching the inline style patterns already used). Actually, just use a simple CSS class via Tailwind `animate-pulse` for the cursor blink.
- The `◆` diamond check mark matches the deadline chip marker already used in TimeGrid
