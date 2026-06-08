# FIRST OF ALL to build this use the chrono-node package

Good — this is actually one of the most important UX decisions in your whole app. A “plain text writer” can either make JustaCal feel *magical* or turn it into another cluttered productivity tool.

You want it to feel like: **you’re writing your day, not configuring a system.**

---

# 🧠 Core idea

The text writer should not be a separate feature.

It should be:

> a “command layer” that sits on top of the calendar

Think:

* Spotlight (Mac)
* Raycast command bar
* Notion quick capture
* Linear command input

not:

* a form
* not a chat
* not a modal-heavy workflow

---

# 🧩 Recommended implementation

## 1. Single entry point (global input)

In the calendar view, allow:

* `cmd + K` (desktop)
* swipe down / floating button (mobile)
* tap empty space (optional shortcut)

This opens a **minimal text bar**.

Example:

```
gym tomorrow 6pm
```

No extra UI unless needed.

---

## 2. Instant parsing pipeline

On submit:

### Step 1: try fast local parsing

Use something like:

* chrono-node
* simple regex for times

If confident → create event immediately.

---

### Step 2: fallback to LLM (light AI)

If ambiguous:

```
“dinner with sam friday at 7”
```

Send to AI → return structured event:

```json
{
  "title": "Dinner with Sam",
  "start": "...",
  "end": "..."
}
```

Then show a **preview card**, not a form.

---

## 3. Preview → confirm flow (IMPORTANT)

After parsing:

Show a small floating confirmation:

```
Dinner with Sam
Friday 7:00–8:30 PM

[Confirm]   [Edit]
```

No big modal. No distraction.

---

## 4. Immediate optimistic insertion

On confirm:

* event appears instantly in calendar
* backend sync happens in background (Supabase)

This is key for “feels fast” UX.

---

# ✨ Where the input should live visually

## Option A (best): floating “command pill”

Bottom center or bottom left:

```
+ Add event…
```

On focus → expands into input bar.

Feels like:

* Notion
* Raycast
* Arc command bar

---

## Option B: inline calendar click

Click empty slot → text input appears in place:

```
6:00 PM ─────────── [ type event... ]
```

This feels VERY “native calendar”.

---

## Option C: hybrid (best long-term)

* global cmd+k input
* inline slot input
* mobile quick add button

---

# 🧠 UX rules (VERY important)

## 1. Never make users “fill forms first”

Bad:

* title field
* start time dropdown
* end time dropdown

Good:

* natural language first
* form only for corrections

---

## 2. Always show parsed result before saving (unless 100% confident)

Users must feel:

> “I control this”

not:

> “AI decided this for me”

---

## 3. Keep friction under 1 second mentally

Ideal flow:

1. type
2. enter
3. done

Anything beyond that feels heavy.

---

# ⚡ Advanced polish ideas (later)

Once MVP works:

## Smart suggestions while typing

* autocomplete “tomorrow”
* suggest people (“sam”)
* suggest durations

## Ghost event preview

As user types:

```
gym tomorrow 6pm  →  [preview block appears in calendar]
```

This is VERY satisfying visually.

---

## Keyboard shortcuts

* Enter → create
* Cmd+E → edit last event
* Cmd+Z → undo event creation

---

# 🪞 The mental model you’re building

You are essentially creating:

> “A calendar where text *is* the interface”

Not:

* forms
* menus
* settings

But:

* language → schedule