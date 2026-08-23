import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/welcome(.*)',
  '/sso-callback(.*)',
  '/api(.*)'
])

export default async function middleware(req, event) {
  try {
    const hasClerkKeys = Boolean(
      process.env.CLERK_SECRET_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    )

    if (hasClerkKeys) {
      const clerkHandler = clerkMiddleware(async (auth, request) => {
        try {
          const session = await auth()
          const userId = session?.userId
          const hasGuestSession = request.cookies.get('tracked_guest_session')?.value === 'true'

          if (!userId && !hasGuestSession && !isPublicRoute(request)) {
            const welcomeUrl = request.nextUrl.clone()
            welcomeUrl.pathname = '/welcome'
            return NextResponse.redirect(welcomeUrl)
          }
        } catch {
          // Ignore auth session retrieval error
        }
      })

      return await clerkHandler(req, event)
    }

    // Fallback if Clerk keys are missing during build/runtime
    const hasGuestSession = req.cookies.get('tracked_guest_session')?.value === 'true'
    if (!hasGuestSession && !isPublicRoute(req)) {
      const welcomeUrl = req.nextUrl.clone()
      welcomeUrl.pathname = '/welcome'
      return NextResponse.redirect(welcomeUrl)
    }

    return NextResponse.next()
  } catch (err) {
    console.error('Middleware execution error caught:', err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

