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

  // DEV-ONLY: with TESTING=true, auto-login instead of gating on the login page.
  // Double-guarded (never production) so it can't disable auth on the live app.
  const testMode =
    process.env.NODE_ENV !== 'production' && process.env.TESTING === 'true'
  if (testMode && !user && path !== '/api/test-login') {
    const url = new URL('/api/test-login', request.nextUrl)
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  if (!user && path === '/') {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.nextUrl))
  }

  // IMPORTANT: return supabaseResponse intact so refreshed cookies propagate.
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)'],
}
