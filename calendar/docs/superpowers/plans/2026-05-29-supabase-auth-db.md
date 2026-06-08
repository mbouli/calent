# Supabase Auth + Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Calent's four localStorage stores with a Supabase Postgres database behind email/password auth, with Row-Level Security as the per-user boundary and server-seeded sample data for new users.

**Architecture:** Approach A — the existing client-side React stores keep their public API and optimistic updates, but persist to Supabase via the `@supabase/ssr` browser client instead of localStorage. Auth/session is refreshed and routes are protected in root `proxy.ts` (this is Next.js 16's renamed middleware). RLS scopes every query to `auth.uid()`.

**Tech Stack:** Next.js 16.2.6 (App Router, `proxy.ts`), React 19, `@supabase/supabase-js`, `@supabase/ssr`, Supabase Postgres + RLS.

**Spec:** `docs/superpowers/specs/2026-05-29-supabase-auth-db-design.md`

---

## Testing note (read first)

This feature is a database/auth integration against a live Supabase project, set
up manually via the dashboard. There is no unit-test runner in this repo (only
Playwright) and no local Supabase instance, so classic per-step TDD is not
practical for the SQL, auth, and store-wiring layers. Instead, each code task is
verified by:

1. **Type-check / build:** `npx tsc --noEmit` (fast) and/or `npm run build`.
2. **Lint:** `npm run lint`.
3. **Manual browser verification:** the checklist in Task 13, run against `npm run dev`.

Where a task says "Verify," run the listed command(s) and confirm the stated
result before committing. Do not claim a task passes without running them.

## File structure

| File | Responsibility | Action |
|---|---|---|
| `.env.local` | Supabase URL + anon key (gitignored) | Create (manual) |
| `.env.local.example` | Committed template of required env vars | Create |
| `app/lib/supabase/client.ts` | Browser Supabase client factory | Create |
| `app/lib/supabase/server.ts` | Server Supabase client factory (cookies) | Create |
| `app/lib/db-types.ts` | DB row types + row↔app mappers (pure) | Create |
| `proxy.ts` | Session refresh + route protection | Create |
| `app/login/page.tsx` | Wire signup/signin handlers | Modify |
| `app/hooks/useSettingsStore.ts` | Persist settings to Supabase | Modify |
| `app/hooks/useCoursesStore.ts` | Persist courses to Supabase | Modify |
| `app/hooks/useCalendarStore.ts` | Persist events to Supabase | Modify |
| `app/hooks/useStickiesStore.ts` | Persist stickies + items to Supabase | Modify |
| `app/components/SettingsModal.tsx` | Wire sign-out button | Modify |

The SQL (schema, RLS, trigger) is applied in the Supabase SQL editor — see Tasks 2–4.

---

### Task 1: Install dependencies and env scaffolding

**Files:**
- Modify: `package.json` (via npm)
- Create: `.env.local` (manual, not committed)
- Create: `.env.local.example`

- [ ] **Step 1: Install Supabase packages**

```bash
npm i @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: (Already done by user) `.env.local.example` exists**

The user has already created `.env.local.example` with:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Do NOT overwrite it. Note the key var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(Supabase's newer publishable key, `sb_publishable_…`), used everywhere the
anon key would have been.

- [ ] **Step 3: (Already done by user) `.env.local` exists with real values**

The user has already created `.env.local` with the real Project URL and
publishable key. Do NOT touch it. (`.env*` is gitignored.)

- [ ] **Step 4: Verify env is ignored by git**

Run: `git status --porcelain .env.local`
Expected: no output (file is ignored).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.local.example
git commit -m "chore: add Supabase deps and env template"
```

---

### Task 2: Apply database schema (Supabase SQL editor)

**Files:** None in repo — run in Supabase dashboard → SQL Editor.

- [ ] **Step 1: Run the schema SQL**

Paste and run the full schema block from the spec (Step 3), reproduced here:

```sql
create type event_color    as enum ('indigo','rose','emerald','amber','violet','sky');
create type recurrence_type as enum ('none','daily','weekdays','weekends','weekly','biweekly','monthly','yearly');
create type event_type      as enum ('event','deadline');
create type app_theme       as enum ('light','dark');

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

create table settings (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  theme             app_theme not null default 'light',
  language          text      not null default 'en',
  timezone          text      not null default 'UTC',
  start_week_monday boolean   not null default true,
  hour_24           boolean   not null default true
);

create table courses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  color      event_color not null,
  created_at timestamptz not null default now()
);

create table events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title               text not null default '',
  "start"             timestamptz not null,
  "end"               timestamptz not null,
  color               event_color not null,
  notes               text,
  all_day             boolean not null default false,
  recurrence          recurrence_type not null default 'none',
  recurrence_group_id uuid,
  course_id           uuid references courses(id) on delete set null,
  type                event_type not null default 'event',
  created_at          timestamptz not null default now()
);
create index events_user_id_idx          on events(user_id);
create index events_recurrence_group_idx on events(recurrence_group_id);

create table stickies (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null default '',
  color      event_color not null,
  body       text,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create index stickies_user_id_idx on stickies(user_id);

create table sticky_items (
  id         uuid primary key default gen_random_uuid(),
  sticky_id  uuid not null references stickies(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text       text not null default '',
  done       boolean not null default false,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index sticky_items_sticky_id_idx on sticky_items(sticky_id);
```

- [ ] **Step 2: Verify tables exist**

In SQL Editor run: `select table_name from information_schema.tables where table_schema = 'public' order by table_name;`
Expected rows: `courses, events, profiles, settings, sticky_items, stickies`.

---

### Task 3: Enable RLS and policies (Supabase SQL editor)

**Files:** None in repo — Supabase SQL Editor.

- [ ] **Step 1: Run the RLS SQL**

```sql
alter table profiles     enable row level security;
alter table settings     enable row level security;
alter table courses      enable row level security;
alter table events       enable row level security;
alter table stickies     enable row level security;
alter table sticky_items enable row level security;

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own settings" on settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own courses" on courses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own events" on events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own stickies" on stickies
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sticky_items" on sticky_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

- [ ] **Step 2: Verify RLS is on for all six tables**

Run: `select relname, relrowsecurity from pg_class where relname in ('profiles','settings','courses','events','stickies','sticky_items');`
Expected: `relrowsecurity = true` for all six rows.

---

### Task 4: Signup trigger with sample data (Supabase SQL editor)

**Files:** None in repo — Supabase SQL Editor.

- [ ] **Step 1: Run the trigger SQL**

```sql
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  today  timestamptz := date_trunc('day', now());
  s_id   uuid;
  c_id   uuid;
begin
  insert into public.profiles (id, full_name)
    values (new.id, new.raw_user_meta_data->>'full_name');
  insert into public.settings (user_id) values (new.id);

  insert into public.courses (user_id, name, color)
    values (new.id, 'Welcome', 'indigo')
    returning id into c_id;

  insert into public.events (user_id, title, "start", "end", color, notes, type, course_id) values
    (new.id, 'Welcome to Calent 👋', today + interval '9 hours',  today + interval '9 hours 30 minutes', 'indigo',  'Click an event to edit it. Drag to move.', 'event', c_id),
    (new.id, 'Try adding your own',  today + interval '14 hours', today + interval '15 hours',           'violet',  null, 'event', null);

  insert into public.stickies (user_id, title, color, position)
    values (new.id, 'Getting started', 'emerald', 0)
    returning id into s_id;
  insert into public.sticky_items (sticky_id, user_id, text, done, position) values
    (s_id, new.id, 'Create your first event', false, 0),
    (s_id, new.id, 'Add a sticky note',        false, 1),
    (s_id, new.id, 'Explore settings',         false, 2);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

> Note: the `insert` statements here pass `user_id`/`new.id` explicitly. The
> `default auth.uid()` on those columns is for client inserts; inside this
> `security definer` trigger there is no session user, so we set it directly.

- [ ] **Step 2: Turn OFF email confirmation**

Supabase → Authentication → Sign In / Providers → Email: disable "Confirm email"
so sign-up logs the user in immediately.

- [ ] **Step 3: Verify trigger seeds data**

Create a throwaway user: Supabase → Authentication → Users → Add user (with an
email + password). Then in SQL Editor run:
`select count(*) from events; select count(*) from stickies; select count(*) from sticky_items; select count(*) from courses;`
Expected: 2 events, 1 sticky, 3 sticky_items, 1 course for that user. Delete the
throwaway user afterward (its rows cascade away).

---

### Task 5: Supabase client factories

**Files:**
- Create: `app/lib/supabase/client.ts`
- Create: `app/lib/supabase/server.ts`

- [ ] **Step 1: Create the browser client**

`app/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

- [ ] **Step 2: Create the server client**

`app/lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore; proxy refreshes.
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors in the two new files.

- [ ] **Step 4: Commit**

```bash
git add app/lib/supabase/client.ts app/lib/supabase/server.ts
git commit -m "feat: add Supabase browser and server clients"
```

---

### Task 6: `proxy.ts` — session refresh + route protection

**Files:**
- Create: `proxy.ts` (project root)

- [ ] **Step 1: Create `proxy.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() (not getSession()) — validates the token server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (!user && path.startsWith('/u')) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/u', request.nextUrl))
  }

  // IMPORTANT: return supabaseResponse intact so refreshed cookies propagate.
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)'],
}
```

- [ ] **Step 2: Verify dev server boots and redirects work**

Run: `npm run dev`, then in a browser (logged out) visit `http://localhost:3000/u`.
Expected: redirected to `/login`. Visiting `/` and `/login` loads normally.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: add proxy for Supabase session refresh and route guards"
```

---

### Task 7: Wire the `/login` page

**Files:**
- Modify: `app/login/page.tsx`

The page currently renders a controlled form with `email`, `password`, `name`
state and `mode` ('signin' | 'signup'), but the submit button has no handler.
Add auth logic, a submitting state, and inline error display.

- [ ] **Step 1: Add imports and auth state at the top of `LoginPage`**

In `app/login/page.tsx`, add these imports near the existing ones:

```ts
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'
```

Inside `export default function LoginPage()`, after the existing `useState`
declarations (`mode`, `email`, `password`, `name`), add:

```ts
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
      router.push('/u')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }
```

- [ ] **Step 2: Wire the submit button**

Find the submit `motion.button` (text `{isSignup ? 'Create account' : 'Sign in'}`)
and change it to call the handler and reflect submitting state:

```tsx
            <motion.button
              variants={item}
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-5 rounded-[10px] py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-85 active:opacity-70 disabled:opacity-50"
              style={{ background: '#FF7264', color: '#0D0D0D' }}
            >
              {submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            </motion.button>
```

- [ ] **Step 3: Add inline error display**

Immediately after that submit button, add:

```tsx
            {error && (
              <p className="mt-3 text-center text-[11.5px]" style={{ color: '#FF7264' }}>
                {error}
              </p>
            )}
```

- [ ] **Step 4: Verify type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Verify signup flow in browser**

With `npm run dev`: go to `/login`, switch to "Create account", enter a new
email + password + name, submit. Expected: redirected to `/u`. (Full data
display is verified once stores are wired.)

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: wire login page to Supabase email/password auth"
```

---

### Task 8: DB row types + pure mappers

**Files:**
- Create: `app/lib/db-types.ts`

Centralize snake_case DB row shapes and the conversions to/from the app's
camelCase types (defined in `app/types/index.ts`). These functions are pure and
keep the store code small.

- [ ] **Step 1: Create `app/lib/db-types.ts`**

```ts
import { CalendarEvent, Course, EventColor, RecurrenceType, Sticky, StickyItem } from '../types'

// ---- Row shapes (snake_case, as returned by Supabase) ----

export interface EventRow {
  id: string
  title: string
  start: string
  end: string
  color: EventColor
  notes: string | null
  all_day: boolean
  recurrence: RecurrenceType
  recurrence_group_id: string | null
  course_id: string | null
  type: 'event' | 'deadline'
}

export interface CourseRow {
  id: string
  name: string
  color: EventColor
}

export interface StickyRow {
  id: string
  title: string
  color: EventColor
  body: string | null
  position: number
}

export interface StickyItemRow {
  id: string
  sticky_id: string
  text: string
  done: boolean
  position: number
}

// ---- Row -> app ----

export function rowToEvent(r: EventRow): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    start: new Date(r.start),
    end: new Date(r.end),
    color: r.color,
    notes: r.notes ?? undefined,
    allDay: r.all_day,
    recurrence: r.recurrence,
    recurrenceGroupId: r.recurrence_group_id ?? undefined,
    courseId: r.course_id ?? undefined,
    type: r.type,
  }
}

export function rowToCourse(r: CourseRow): Course {
  return { id: r.id, name: r.name, color: r.color }
}

export function rowToSticky(r: StickyRow, items: StickyItem[]): Sticky {
  return {
    id: r.id,
    title: r.title,
    color: r.color,
    body: r.body ?? undefined,
    order: r.position,
    items,
  }
}

export function rowToStickyItem(r: StickyItemRow): StickyItem {
  return { id: r.id, text: r.text, done: r.done }
}

// ---- app -> row (for insert/update payloads; omit id/user_id) ----

export function eventToRow(e: Partial<CalendarEvent>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (e.title !== undefined) row.title = e.title
  if (e.start !== undefined) row.start = e.start.toISOString()
  if (e.end !== undefined) row.end = e.end.toISOString()
  if (e.color !== undefined) row.color = e.color
  if ('notes' in e) row.notes = e.notes ?? null
  if (e.allDay !== undefined) row.all_day = e.allDay
  if (e.recurrence !== undefined) row.recurrence = e.recurrence
  if ('recurrenceGroupId' in e) row.recurrence_group_id = e.recurrenceGroupId ?? null
  if ('courseId' in e) row.course_id = e.courseId ?? null
  if (e.type !== undefined) row.type = e.type
  return row
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/db-types.ts
git commit -m "feat: add Supabase row types and pure mappers"
```

---

### Task 9: Convert `useSettingsStore`

**Files:**
- Modify: `app/hooks/useSettingsStore.ts`

Single settings row per user (created by the trigger). Read on mount, write
updates through. Keep the `Settings`/`Theme` types and `applyTheme` effect.

- [ ] **Step 1: Replace the store body**

Rewrite `app/hooks/useSettingsStore.ts` as:

```ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '../lib/supabase/client'

export type Theme = 'light' | 'dark'

export interface Settings {
  theme: Theme
  language: string
  timezone: string
  startWeekMonday: boolean
  hour24: boolean
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  language: 'en',
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  startWeekMonday: true,
  hour24: true,
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function useSettingsStore() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('settings')
      .select('theme, language, timezone, start_week_monday, hour_24')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            theme: data.theme,
            language: data.language,
            timezone: data.timezone,
            startWeekMonday: data.start_week_monday,
            hour24: data.hour_24,
          })
        }
      })
  }, [])

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates }
      const supabase = createClient()
      const row: Record<string, unknown> = {}
      if (updates.theme !== undefined) row.theme = updates.theme
      if (updates.language !== undefined) row.language = updates.language
      if (updates.timezone !== undefined) row.timezone = updates.timezone
      if (updates.startWeekMonday !== undefined) row.start_week_monday = updates.startWeekMonday
      if (updates.hour24 !== undefined) row.hour_24 = updates.hour24
      supabase.from('settings').update(row).then(({ error }) => {
        if (error) console.error('Failed to save settings', error)
      })
      return next
    })
  }, [])

  return { settings, updateSettings }
}
```

> Note: `.update(row)` needs no `.eq('user_id', …)` filter — RLS restricts the
> update to the caller's own single row.

- [ ] **Step 2: Verify type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useSettingsStore.ts
git commit -m "feat: persist settings to Supabase"
```

---

### Task 10: Convert `useCoursesStore`

**Files:**
- Modify: `app/hooks/useCoursesStore.ts`

- [ ] **Step 1: Replace the store body**

Rewrite `app/hooks/useCoursesStore.ts` as:

```ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Course } from '../types'
import { createClient } from '../lib/supabase/client'
import { rowToCourse } from '../lib/db-types'

export function useCoursesStore() {
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('courses')
      .select('id, name, color')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setCourses(data.map(rowToCourse))
      })
  }, [])

  const createCourse = useCallback(
    (data: Omit<Course, 'id'>): Course => {
      const id = crypto.randomUUID()
      const course: Course = { ...data, id }
      setCourses(prev => [...prev, course])
      const supabase = createClient()
      supabase
        .from('courses')
        .insert({ id, name: data.name, color: data.color })
        .then(({ error }) => { if (error) console.error('createCourse failed', error) })
      return course
    },
    []
  )

  const updateCourse = useCallback(
    (id: string, patch: Partial<Omit<Course, 'id'>>) => {
      setCourses(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
      const supabase = createClient()
      supabase.from('courses').update(patch).eq('id', id)
        .then(({ error }) => { if (error) console.error('updateCourse failed', error) })
    },
    []
  )

  const deleteCourse = useCallback(
    (id: string) => {
      setCourses(prev => prev.filter(c => c.id !== id))
      const supabase = createClient()
      supabase.from('courses').delete().eq('id', id)
        .then(({ error }) => { if (error) console.error('deleteCourse failed', error) })
    },
    []
  )

  return { courses, createCourse, updateCourse, deleteCourse }
}
```

> We generate the `id` client-side so the optimistic row matches the DB row
> (instead of waiting for the insert to return). `user_id` is stamped by the
> column default `auth.uid()`.

- [ ] **Step 2: Verify type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useCoursesStore.ts
git commit -m "feat: persist courses to Supabase"
```

---

### Task 11: Convert `useCalendarStore`

**Files:**
- Modify: `app/hooks/useCalendarStore.ts`

Preserve the full public API: `events, currentDate, setCurrentDate, viewMode,
setViewMode, createEvent, createEvents, updateEvent, deleteEvent,
deleteFutureEvents, stripCourseId`. Swap persistence for Supabase; drop sample
seeding (the trigger handles new-user data).

- [ ] **Step 1: Replace the store body**

Rewrite `app/hooks/useCalendarStore.ts` as:

```ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarEvent, ViewMode } from '../types'
import { createClient } from '../lib/supabase/client'
import { rowToEvent, eventToRow, EventRow } from '../lib/db-types'

const EVENT_COLUMNS =
  'id, title, start, "end", color, notes, all_day, recurrence, recurrence_group_id, course_id, type'

export function useCalendarStore() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .then(({ data }) => {
        if (data) setEvents((data as unknown as EventRow[]).map(rowToEvent))
      })
  }, [])

  const createEvent = useCallback((data: Omit<CalendarEvent, 'id'>) => {
    const id = crypto.randomUUID()
    const e: CalendarEvent = { ...data, id }
    setEvents(prev => [...prev, e])
    const supabase = createClient()
    supabase.from('events').insert({ id, ...eventToRow(data) })
      .then(({ error }) => { if (error) console.error('createEvent failed', error) })
    return e
  }, [])

  const createEvents = useCallback((items: Omit<CalendarEvent, 'id'>[]) => {
    const withIds = items.map(data => ({ ...data, id: crypto.randomUUID() }))
    setEvents(prev => [...prev, ...withIds])
    const supabase = createClient()
    const rows = withIds.map(({ id, ...rest }) => ({ id, ...eventToRow(rest) }))
    supabase.from('events').insert(rows)
      .then(({ error }) => { if (error) console.error('createEvents failed', error) })
  }, [])

  const updateEvent = useCallback(
    (id: string, updates: Partial<Omit<CalendarEvent, 'id'>>) => {
      setEvents(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)))
      const supabase = createClient()
      supabase.from('events').update(eventToRow(updates)).eq('id', id)
        .then(({ error }) => { if (error) console.error('updateEvent failed', error) })
    },
    []
  )

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    const supabase = createClient()
    supabase.from('events').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deleteEvent failed', error) })
  }, [])

  const deleteFutureEvents = useCallback((id: string) => {
    setEvents(prev => {
      const target = prev.find(e => e.id === id)
      const supabase = createClient()
      if (!target?.recurrenceGroupId) {
        supabase.from('events').delete().eq('id', id)
          .then(({ error }) => { if (error) console.error('deleteFutureEvents failed', error) })
        return prev.filter(e => e.id !== id)
      }
      supabase
        .from('events')
        .delete()
        .eq('recurrence_group_id', target.recurrenceGroupId)
        .gte('start', target.start.toISOString())
        .then(({ error }) => { if (error) console.error('deleteFutureEvents failed', error) })
      return prev.filter(e =>
        !(e.recurrenceGroupId === target.recurrenceGroupId && e.start >= target.start)
      )
    })
  }, [])

  const stripCourseId = useCallback((courseId: string) => {
    setEvents(prev => prev.map(e => (e.courseId === courseId ? { ...e, courseId: undefined } : e)))
    const supabase = createClient()
    supabase.from('events').update({ course_id: null }).eq('course_id', courseId)
      .then(({ error }) => { if (error) console.error('stripCourseId failed', error) })
  }, [])

  return {
    events,
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    createEvent,
    createEvents,
    updateEvent,
    deleteEvent,
    deleteFutureEvents,
    stripCourseId,
  }
}
```

- [ ] **Step 2: Verify type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useCalendarStore.ts
git commit -m "feat: persist events to Supabase"
```

---

### Task 12: Convert `useStickiesStore`

**Files:**
- Modify: `app/hooks/useStickiesStore.ts`

Stickies + their `sticky_items`. Preserve the public API: `stickies` (sorted by
order), `createSticky, updateSticky, deleteSticky, reorderStickies, addItem,
toggleItem, updateItem, clearDoneItems, reorderItems`. Item changes write to
`sticky_items`; `reorderStickies` writes `position` on `stickies`.

- [ ] **Step 1: Replace the store body**

Rewrite `app/hooks/useStickiesStore.ts` as:

```ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sticky, EventColor } from '../types'
import { createClient } from '../lib/supabase/client'
import { rowToSticky, rowToStickyItem, StickyRow, StickyItemRow } from '../lib/db-types'

function makeId() { return crypto.randomUUID() }

export function useStickiesStore() {
  const [stickies, setStickies] = useState<Sticky[]>([])

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const [{ data: sRows }, { data: iRows }] = await Promise.all([
        supabase.from('stickies').select('id, title, color, body, position'),
        supabase.from('sticky_items').select('id, sticky_id, text, done, position').order('position', { ascending: true }),
      ])
      if (!sRows) return
      const items = (iRows ?? []) as StickyItemRow[]
      setStickies(
        (sRows as StickyRow[]).map(s =>
          rowToSticky(
            s,
            items.filter(i => i.sticky_id === s.id).map(rowToStickyItem)
          )
        )
      )
    }
    load()
  }, [])

  const createSticky = useCallback((color: EventColor) => {
    const id = makeId()
    setStickies(prev => {
      const position = prev.length
      const s: Sticky = { id, title: '', color, items: [], body: undefined, order: position }
      const supabase = createClient()
      supabase.from('stickies').insert({ id, color, position })
        .then(({ error }) => { if (error) console.error('createSticky failed', error) })
      return [...prev, s]
    })
  }, [])

  const updateSticky = useCallback((id: string, updates: Partial<Omit<Sticky, 'id'>>) => {
    setStickies(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)))
    const supabase = createClient()
    const row: Record<string, unknown> = {}
    if (updates.title !== undefined) row.title = updates.title
    if (updates.color !== undefined) row.color = updates.color
    if ('body' in updates) row.body = updates.body ?? null
    if (updates.order !== undefined) row.position = updates.order
    if (Object.keys(row).length) {
      supabase.from('stickies').update(row).eq('id', id)
        .then(({ error }) => { if (error) console.error('updateSticky failed', error) })
    }
  }, [])

  const deleteSticky = useCallback((id: string) => {
    setStickies(prev => prev.filter(s => s.id !== id))
    const supabase = createClient()
    supabase.from('stickies').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deleteSticky failed', error) })
  }, [])

  const reorderStickies = useCallback((ordered: Sticky[]) => {
    const next = ordered.map((s, i) => ({ ...s, order: i }))
    setStickies(next)
    const supabase = createClient()
    next.forEach((s, i) => {
      supabase.from('stickies').update({ position: i }).eq('id', s.id)
        .then(({ error }) => { if (error) console.error('reorderStickies failed', error) })
    })
  }, [])

  const addItem = useCallback((stickyId: string, text: string) => {
    const itemId = makeId()
    setStickies(prev => prev.map(s => {
      if (s.id !== stickyId) return s
      const supabase = createClient()
      supabase.from('sticky_items').insert({ id: itemId, sticky_id: stickyId, text, position: s.items.length })
        .then(({ error }) => { if (error) console.error('addItem failed', error) })
      return { ...s, items: [...s.items, { id: itemId, text, done: false }] }
    }))
  }, [])

  const toggleItem = useCallback((stickyId: string, itemId: string) => {
    setStickies(prev => prev.map(s => {
      if (s.id !== stickyId) return s
      const item = s.items.find(it => it.id === itemId)
      if (item) {
        const supabase = createClient()
        supabase.from('sticky_items').update({ done: !item.done }).eq('id', itemId)
          .then(({ error }) => { if (error) console.error('toggleItem failed', error) })
      }
      return { ...s, items: s.items.map(it => it.id === itemId ? { ...it, done: !it.done } : it) }
    }))
  }, [])

  const updateItem = useCallback((stickyId: string, itemId: string, text: string) => {
    setStickies(prev => prev.map(s =>
      s.id === stickyId
        ? { ...s, items: s.items.map(it => it.id === itemId ? { ...it, text } : it) }
        : s
    ))
    const supabase = createClient()
    supabase.from('sticky_items').update({ text }).eq('id', itemId)
      .then(({ error }) => { if (error) console.error('updateItem failed', error) })
  }, [])

  const clearDoneItems = useCallback((stickyId: string) => {
    setStickies(prev => prev.map(s =>
      s.id === stickyId ? { ...s, items: s.items.filter(it => !it.done) } : s
    ))
    const supabase = createClient()
    supabase.from('sticky_items').delete().eq('sticky_id', stickyId).eq('done', true)
      .then(({ error }) => { if (error) console.error('clearDoneItems failed', error) })
  }, [])

  const reorderItems = useCallback((stickyId: string, ordered: Sticky['items']) => {
    setStickies(prev => prev.map(s => s.id === stickyId ? { ...s, items: ordered } : s))
    const supabase = createClient()
    ordered.forEach((it, i) => {
      supabase.from('sticky_items').update({ position: i }).eq('id', it.id)
        .then(({ error }) => { if (error) console.error('reorderItems failed', error) })
    })
  }, [])

  return {
    stickies: [...stickies].sort((a, b) => a.order - b.order),
    createSticky,
    updateSticky,
    deleteSticky,
    reorderStickies,
    addItem,
    toggleItem,
    updateItem,
    clearDoneItems,
    reorderItems,
  }
}
```

- [ ] **Step 2: Verify type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useStickiesStore.ts
git commit -m "feat: persist stickies and items to Supabase"
```

---

### Task 13: Wire sign-out in SettingsModal + full verification

**Files:**
- Modify: `app/components/SettingsModal.tsx`

`AccountSection` (around line 357) already renders a "Sign out" button with no
handler, plus a hardcoded name/email. Wire sign-out and populate the user's email.

- [ ] **Step 1: Add imports to `SettingsModal.tsx`**

Near the top imports add:

```ts
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
```

(Merge with the existing `react` import if one already imports `useState`.)

- [ ] **Step 2: Make `AccountSection` load the user and handle sign-out**

Replace the `function AccountSection() {` signature and its profile rows so it
shows the real email and signs out. Update the opening of the function:

```tsx
function AccountSection() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '')
        setFullName((data.user.user_metadata?.full_name as string) ?? '')
      }
    })
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
```

- [ ] **Step 3: Use the real name/email and wire the button**

Change the hardcoded name span to `{fullName || '—'}` and the email span to
`{email}`. Then add `onClick={handleSignOut}` to the existing "Sign out" button:

```tsx
      <SettingRow label="Name">
        <span className="text-sm text-gray-500">{fullName || '—'}</span>
      </SettingRow>
      <SettingRow label="Email">
        <span className="text-xs text-gray-400 font-mono">{email}</span>
      </SettingRow>
```

```tsx
      <SettingRow label="Sign out">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors"
        >
          <LogOut size={11} />
          Sign out
        </button>
      </SettingRow>
```

- [ ] **Step 4: Verify type-check, lint, and build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all succeed with no errors.

- [ ] **Step 5: Full manual verification (from the spec, Step 10)**

With `npm run dev`:
1. Logged out, visit `/u` → redirected to `/login`.
2. Create a new account → lands on `/u` showing the sample course, 2 events
   today, and the "Getting started" sticky with 3 items.
3. Reload → data persists (served from DB).
4. In Supabase Table Editor, confirm rows carry your `user_id`.
5. Edit/move/delete an event; toggle/add a sticky item; change a setting →
   reload and confirm each change round-trips.
6. Open Settings → Account → Sign out → redirected to `/login`.
7. Create a second account → it sees only its own samples, never the first
   account's data (RLS proof).

- [ ] **Step 6: Commit**

```bash
git add app/components/SettingsModal.tsx
git commit -m "feat: wire sign-out and user info in SettingsModal"
```

---

## Self-review notes

- **Spec coverage:** Steps 1–10 of the spec map to Tasks 1–13 (project setup→1;
  packages/env→1; schema→2; RLS→3; trigger+samples→4; clients→5; proxy→6;
  login→7; mappers+stores→8–12; sign-out→13; verification→13).
- **Type consistency:** Store public APIs are unchanged, so consuming components
  (`app/u/page.tsx`, panels) need no edits. `Sticky.order` ↔ DB `position` and
  all snake/camel conversions are centralized in `app/lib/db-types.ts` and the
  per-store update mappers.
- **Known follow-ups (out of scope):** Google OAuth, re-enabling email
  confirmation + SMTP, server-component first-paint fetching, realtime sync,
  loading skeletons, and rollback-on-write-error (current code logs errors;
  optimistic state is not reverted on failure).
