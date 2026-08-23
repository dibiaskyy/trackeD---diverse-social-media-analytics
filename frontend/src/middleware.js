import { NextResponse } from 'next/server'

export function middleware(req) {
  const { pathname } = req.nextUrl

  // 1. Allow public routes and internal APIs
  if (
    pathname.startsWith('/welcome') ||
    pathname.startsWith('/sso-callback') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  // 2. Check for active Clerk Auth session or Guest session cookies
  const hasClerkSession = Boolean(
    req.cookies.get('__session')?.value ||
    req.cookies.get('__client_uat')?.value
  )
  const hasGuestSession = req.cookies.get('tracked_guest_session')?.value === 'true'

  // 3. If unauthenticated, redirect to the welcome page
  if (!hasClerkSession && !hasGuestSession) {
    const welcomeUrl = req.nextUrl.clone()
    welcomeUrl.pathname = '/welcome'
    return NextResponse.redirect(welcomeUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals, images, and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)',
  ],
}


