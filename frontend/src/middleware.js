import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/welcome(.*)',
  '/sso-callback(.*)',
  '/api(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  try {
    let userId = null
    try {
      const session = await auth()
      userId = session?.userId
    } catch {
      // Auth context fallback
    }

    const hasGuestSession = req.cookies.get('tracked_guest_session')?.value === 'true'

    // If not signed in and no guest session cookie is present, redirect to /welcome
    if (!userId && !hasGuestSession && !isPublicRoute(req)) {
      const welcomeUrl = req.nextUrl.clone()
      welcomeUrl.pathname = '/welcome'
      return NextResponse.redirect(welcomeUrl)
    }
  } catch (err) {
    console.error('Middleware safe execution error:', err)
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

