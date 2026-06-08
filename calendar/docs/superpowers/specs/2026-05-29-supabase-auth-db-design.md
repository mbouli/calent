# Supabase Auth + Database — Design & Tutorial

**Date:** 2026-05-29
**Status:** Approved design, ready for implementation plan

Make Calent "real": replace the four localStorage stores with a Supabase Postgres
database behind email/password auth, with Row-Level Security as the per-user
boundary. Written as a step-by-step tutorial.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Scope | Full vertical slice: auth wired + schema + RLS + all 4 stores synced |
| Auth methods | Email/password now. Google button stays as UI, wired later |
| Email confirmation | **Off** for now (dev). Re-enable before launch |
| Stickies model | Separate `sticky_items` table (FK + cascade) |
| Existing localStorage data | Start fresh in DB — no migration code |
| Sample data | **Yes** — seed a small sample set for every new user |
| Architecture | **Approach A**: client-side stores persist to Supabase via `@supabase/ssr` browser client; RLS is the security boundary |

## Key environment note

This project runs **Next.js 16.2.6**, which renamed the middleware concept to
**Proxy**. Session refresh + route protection live in **`proxy.ts` at the
project root**, NOT `middleware.ts`. The standard `@supabase/ssr` guide says
`middleware.ts`; here it is `proxy.ts` with a `proxy` default export.

---

## Step 1 — Create the Supabase project

1. Create a project at supabase.com.
2. Project Settings → API: copy the **Project URL** and the **anon public** key.
3. Authentication → Providers → Email: ensure **Email** is enabled and turn
   **"Confirm email" OFF** (Authentication → Sign In / Providers, or Email
   provider settings). This lets sign-up log the user in immediately.

## Step 2 — Install packages & env

```bash
npm i @supabase/supabase-js @supabase/ssr
```

Create `.env.local` (already covered by `.env*` in `.gitignore`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-public-key>
```

## Step 3 — Database schema

Run in the Supabase SQL editor. Enums mirror `app/types/index.ts` exactly.

```sql
-- Enums (mirror app/types/index.ts)
create type event_color    as enum ('indigo','rose','emerald','amber','violet','sky');
create type recurrence_type as enum ('none','daily','weekdays','weekends','weekly','biweekly','monthly','yearly');
create type event_type      as enum ('event','deadline');
create type app_theme       as enum ('light','dark');

-- profiles: 1 row per auth user (holds the signup "Full name")
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

-- settings: 1 row per user
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
  position   int  not null default 0,   -- "order" is reserved → position
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

Notes:
- `course_id … on delete set null` mirrors the existing `stripCourseId` behavior.
- `sticky_items` carries its own `user_id` so RLS is a fast `user_id = auth.uid()`
  with no join; `on delete cascade` cleans up items when a sticky is deleted.
- `position` replaces the reserved word `order`.
- `user_id … default auth.uid()` means client inserts never pass `user_id`; the
  DB stamps it from the authenticated session, and the RLS `with check` still
  guarantees it equals the caller.

## Step 4 — Row-Level Security

RLS is the entire security boundary for Approach A. Enable on every table, one
owner-scoped policy each. `using` guards read/update/delete; `with check` guards
insert/update so a user cannot write rows owned by someone else.

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

## Step 5 — Auto-provision + sample data on signup (trigger)

Every new user atomically gets a profile, a settings row, and a small sample set
(two events today, one sticky with checklist items, one course). Times are
relative to `now()` so samples always look current.

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
  -- profile + settings
  insert into public.profiles (id, full_name)
    values (new.id, new.raw_user_meta_data->>'full_name');
  insert into public.settings (user_id) values (new.id);

  -- sample course
  insert into public.courses (user_id, name, color)
    values (new.id, 'Welcome', 'indigo')
    returning id into c_id;

  -- sample events (today)
  insert into public.events (user_id, title, "start", "end", color, notes, type, course_id) values
    (new.id, 'Welcome to Calent 👋', today + interval '9 hours',  today + interval '9 hours 30 minutes', 'indigo',  'Click an event to edit it. Drag to move.', 'event', c_id),
    (new.id, 'Try adding your own',  today + interval '14 hours', today + interval '15 hours',           'violet',  null, 'event', null);

  -- sample sticky + items
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

The login form passes `full_name` via `options.data` on `signUp`, which lands in
`raw_user_meta_data`. Because the trigger is `security definer`, it bypasses RLS
to insert the user's own seed rows.

## Step 6 — Supabase clients

`app/lib/supabase/client.ts` (browser):

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

`app/lib/supabase/server.ts` (server components / route handlers):

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
            // called from a Server Component — safe to ignore; proxy refreshes
          }
        },
      },
    }
  )
}
```

## Step 7 — `proxy.ts` (NOT middleware.ts)

Root-level `proxy.ts`. Refreshes the session every request and protects routes.
Critical rule from the `@supabase/ssr` pattern: call `getUser()` (not
`getSession()`) and return the `supabaseResponse` object intact so refreshed
auth cookies propagate.

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // unauthenticated → block /u
  if (!user && path.startsWith('/u')) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }
  // authenticated → keep them out of /login
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/u', request.nextUrl))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)'],
}
```

## Step 8 — Wire the existing `/login` page

`app/login/page.tsx` already has the full UI. Add behavior only:

- **Sign up:** `supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })`
- **Sign in:** `supabase.auth.signInWithPassword({ email, password })`
- On success: `router.push('/u')`.
- Surface auth errors inline (e.g. below the submit button); add a submitting
  state to disable the button.
- The Google button stays UI-only for now.

Add a **sign out** action in the **`SettingsModal`**:
`await supabase.auth.signOut()` then `router.push('/login')`.

## Step 9 — Convert the four stores (same public API)

Each hook keeps its current return signature, so **no component changes**. Swap
persistence from localStorage to Supabase; keep optimistic local state.

General pattern per store:
- On mount: `select` the user's rows (RLS scopes automatically). Set loading
  state until first fetch resolves.
- Each mutation: update local state optimistically, then `insert/update/delete`
  via the browser client; on error, log and roll back (or refetch).
- Drop all `makeSample*` seeding and `localStorage` reads/writes — the DB is now
  the source of truth and the trigger handles new-user samples.

Per-store specifics:
- **`useCalendarStore`** — map `start`/`end` between JS `Date` and ISO/`timestamptz`
  strings (DB stores timestamptz; convert on read/write). Map snake_case columns
  (`all_day`, `recurrence_group_id`, `course_id`) to the camelCase TS fields.
  `createEvents` → bulk `insert`. `deleteFutureEvents` → delete where
  `recurrence_group_id = … and "start" >= …`. `stripCourseId` → update
  `course_id = null where course_id = …`.
- **`useCoursesStore`** — straightforward CRUD on `courses`.
- **`useStickiesStore`** — load `stickies` plus their `sticky_items`; assemble the
  nested `items` shape the UI expects. Item mutations (`addItem`, `toggleItem`,
  `updateItem`, `clearDoneItems`, `reorderItems`) write to `sticky_items`.
  `reorderStickies` updates `position` on `stickies`.
- **`useSettingsStore`** — read the single settings row on mount (default applied
  by trigger); `updateSettings` → `update` the row. Keep the existing
  `applyTheme` effect.

## Step 10 — Verify

1. `npm run dev`. Visit `/u` while logged out → redirected to `/login`.
2. Sign up with a new email → lands on `/u` with the sample course, events, and
   sticky present.
3. Reload → data persists (now from DB, not localStorage).
4. In Supabase Table Editor, confirm rows carry your `user_id`.
5. Sign out → `/login`. Sign up a second account → it sees only its own samples,
   never the first account's data (RLS proof).
6. Edit/move/delete events and stickies; confirm changes round-trip after reload.

## Out of scope (follow-ups)

- Google OAuth wiring.
- Re-enabling email confirmation + custom SMTP before launch.
- Server-component data fetching for first-paint data (can migrate hot paths later).
- Realtime / multi-device live sync.
- localStorage → DB migration for existing local data (chose "start fresh").
