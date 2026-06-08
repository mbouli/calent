# Landing Spotlight + Pricing Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Spotlight feature highlight section and a Free/Plus pricing section to the landing page, between the bento grid and the footer.

**Architecture:** Both sections are pure JSX additions to `app/components/LandingPage.tsx`. They use the existing `C` color constants, `Reveal` scroll-animation component, and inline-style patterns already established in the file. No new dependencies or imports are needed.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, `motion/react` (already imported), inline styles matching existing patterns.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `app/components/LandingPage.tsx` | Modify | Add two new `<section>` blocks between the closing `</section>` of BENTO FEATURES and the `<footer>` |

---

### Task 1: Add the Spotlight feature section

**Files:**
- Modify: `app/components/LandingPage.tsx`

- [ ] **Step 1: Read the current file to locate the insertion point**

Open `app/components/LandingPage.tsx` and find this comment near the bottom:

```tsx
      {/* FOOTER */}
      <footer
```

Everything before the `{/* FOOTER */}` comment is where the new sections go.

- [ ] **Step 2: Insert the Spotlight section just before `{/* FOOTER */}`**

Add this block immediately before the `{/* FOOTER */}` comment:

```tsx
      {/* SPOTLIGHT FEATURE */}
      <section className="max-w-275 mx-auto px-6 md:px-12 pt-0 pb-10">
        <Reveal>
          <div
            className="flex flex-col md:flex-row items-center gap-10 md:gap-14 rounded-2xl px-8 md:px-12 py-12"
            style={{ backgroundColor: C.offWhite }}
          >
            {/* Left: copy */}
            <div className="flex-none md:w-75
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-5 text-[11px] font-medium"
                style={{ backgroundColor: C.ink, color: 'rgba(255,255,255,0.75)' }}
              >
                <kbd
                  className="rounded text-white text-[11px] font-mono px-1.5 py-px"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >⌘K</kbd>
                anywhere
              </div>
              <h2
                className="text-[1.85rem] font-semibold leading-[1.15] tracking-tight"
                style={{ color: C.ink }}
              >
                Type your day.<br />
                <span style={{ color: C.salmon }}>Calent does the rest.</span>
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: `${C.ink}73` }}>
                No forms. No dropdowns. Just describe what you need and your event lands on the calendar with a tap to confirm.
              </p>
            </div>

            {/* Right: command bar mockup */}
            <div className="flex-1 flex flex-col gap-2 w-full">
              {/* Input bar */}
              <div
                className="flex items-center gap-2.5 rounded-[14px] px-4 py-3"
                style={{
                  background: '#fff',
                  border: `1px solid ${C.ink}12`,
                  boxShadow: '0 1px 3px rgba(13,13,13,0.06), 0 8px 32px rgba(13,13,13,0.08)',
                }}
              >
                <span className="text-sm shrink-0" style={{ color: `${C.ink}50` }}>⌕</span>
                <span className="text-[13px]" style={{ color: C.ink }}>
                  gym tomorrow 6pm
                  <span
                    className="inline-block w-[1.5px] h-3.25l-px align-middle animate-pulse"
                    style={{ background: C.salmon }}
                  />
                </span>
              </div>
              {/* Preview card */}
              <div
                className="rounded-[14px] px-4 py-3.5"
                style={{
                  background: '#fff',
                  border: `1px solid ${C.ink}12`,
                  boxShadow: '0 1px 3px rgba(13,13,13,0.06), 0 8px 32px rgba(13,13,13,0.08)',
                }}
              >
                <p className="text-[13px] font-semibold mb-0.5" style={{ color: C.ink }}>Gym</p>
                <p className="text-[11.5px] mb-3" style={{ color: `${C.ink}66` }}>Tomorrow · 18:00-19:00</p>
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-[9px] py-2 text-[11.5px] font-semibold text-white"
                    style={{ background: C.ink }}
                  >
                    Add to calendar
                  </button>
                  <button
                    className="rounded-[9px] px-4 py-2 text-[11.5px] font-medium"
                    style={{ border: `1px solid ${C.ink}24`, color: `${C.ink}80` }}
                  >
                    Edit
                  </button>
                </div>
                <p className="text-[10px] text-center mt-2.5" style={{ color: `${C.ink}4d` }}>
                  Press{' '}
                  <kbd className="rounded px-1 py-px font-mono text-[9px]" style={{ background: `${C.ink}0f`, color: `${C.ink}73` }}>↵</kbd>
                  {' '}to confirm ·{' '}
                  <kbd className="rounded px-1 py-px font-mono text-[9px]" style={{ background: `${C.ink}0f`, color: `${C.ink}73` }}>Esc</kbd>
                  {' '}to close
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/mason/Documents/startup/caly && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/mason/Documents/startup/caly && git add app/components/LandingPage.tsx && git commit -m "feat: add Spotlight feature highlight section to landing page"
```

---

### Task 2: Add the Pricing section

**Files:**
- Modify: `app/components/LandingPage.tsx`

- [ ] **Step 1: Insert the Pricing section immediately after the Spotlight section, still before `{/* FOOTER */}`**

Add this block between the closing `</section>` of the Spotlight section and the `{/* FOOTER */}` comment:

```tsx
      {/* PRICING */}
      <section className="max-w-275 mx-auto px-6 md:px-12 pt-0 pb-20">
        <Reveal>
          <div
            className="rounded-2xl px-8 md:px-11 py-10"
            style={{ border: `1px solid ${C.ink}12` }}
          >
            <div className="text-center mb-7">
              <h2
                className="text-[1.65rem] font-semibold tracking-tight mb-1.5"
                style={{ color: C.ink }}
              >
                Simple pricing.
              </h2>
              <p className="text-sm" style={{ color: `${C.ink}66` }}>
                Start free. Upgrade when you're ready.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Free plan */}
              <div
                className="rounded-[14px] p-6 flex flex-col"
                style={{ border: `1px solid ${C.ink}12` }}
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.06em] mb-3.5"
                  style={{ color: `${C.ink}59` }}
                >
                  Free
                </p>
                <p
                  className="text-[32px] font-bold tracking-[-0.04em] leading-none mb-0.5"
                  style={{ color: C.ink }}
                >
                  $0{' '}
                  <span className="text-[15px] font-normal" style={{ color: `${C.ink}59` }}>
                    /forever
                  </span>
                </p>
                <p className="text-[11px] mb-5" style={{ color: `${C.ink}59` }}>&nbsp;</p>
                <div className="h-px mb-4" style={{ background: `${C.ink}12` }} />
                <ul className="flex flex-col gap-2 mb-6 flex-1">
                  {[
                    'Week, day & month views',
                    'Google Calendar sync',
                    'Recurring events',
                    'Stickies & checklists',
                    'Deadlines & course colours',
                    'Themes & mobile-friendly',
                  ].map(f => (
                    <li
                      key={f}
                      className="flex items-start gap-1.5 text-[12.5px] leading-snug"
                      style={{ color: `${C.ink}a6` }}
                    >
                      <span className="shrink-0 mt-px text-[11px]" style={{ color: `${C.ink}40` }}>◆</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full rounded-[9px] py-2.5 text-[12.5px] font-semibold"
                  style={{ background: `${C.ink}0f`, color: C.ink }}
                >
                  Get started free
                </button>
              </div>

              {/* Plus plan */}
              <div
                className="rounded-[14px] p-6 flex flex-col"
                style={{ background: C.ink }}
              >
                <span
                  className="self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider mb-3.5"
                  style={{ background: C.salmon, color: C.ink }}
                >
                  Plus
                </span>
                <p
                  className="text-[32px] font-bold tracking-[-0.04em] leading-none mb-0.5"
                  style={{ color: '#fff' }}
                >
                  $5{' '}
                  <span className="text-[15px] font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    /month
                  </span>
                </p>
                <p className="text-[11px] mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  or $48/year -{' '}
                  <span style={{ color: C.salmon, fontWeight: 600 }}>save 20%</span>
                </p>
                <div className="h-px mb-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <ul className="flex flex-col gap-2 mb-6 flex-1">
                  {([
                    { text: 'Everything in Free', highlight: false },
                    { text: 'Personalise themes, spacing & typography', highlight: true },
                    { text: 'Add events by typing plain English', highlight: true },
                    { text: 'Paste your syllabus, get your deadlines automatically', highlight: true },
                  ] as const).map(f => (
                    <li
                      key={f.text}
                      className="flex items-start gap-1.5 text-[12.5px] leading-snug"
                      style={{ color: f.highlight ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.55)' }}
                    >
                      <span className="shrink-0 mt-px text-[11px]" style={{ color: C.salmon }}>◆</span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full rounded-[9px] py-2.5 text-[12.5px] font-semibold"
                  style={{ background: C.salmon, color: C.ink }}
                >
                  Start Plus
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/mason/Documents/startup/caly && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/mason/Documents/startup/caly && git add app/components/LandingPage.tsx && git commit -m "feat: add Free/Plus pricing cards to landing page"
```

---

## Self-Review

**Spec coverage:**
- [x] Spotlight section with offWhite bg, ink pill, salmon heading accent - Task 1
- [x] Command bar mockup (input + preview card) in Spotlight - Task 1
- [x] Pricing section header "Simple pricing." - Task 2
- [x] Free card: white bg, ink border, 6 features, ◆ checks - Task 2
- [x] Plus card: ink bg, salmon badge, $5/mo, $48/yr, 4 features, salmon CTA - Task 2
- [x] Both wrapped in Reveal for scroll animation - Tasks 1 & 2
- [x] Uses existing C color constants, no new imports - both tasks
- [x] No em-dashes (uses ` - ` hyphen in "or $48/year - save 20%") - Task 2

**Placeholder scan:** None found.

**Type consistency:** `C.salmon`, `C.ink`, `C.offWhite` used consistently. `as const` applied to the Plus features array to satisfy TypeScript's narrowing on the `highlight` boolean.
