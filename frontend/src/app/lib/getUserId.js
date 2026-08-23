import { auth } from '@clerk/nextjs/server'

/**
 * Extracts the user ID from Clerk auth session or falls back to anonymous guest session ID.
 */
export async function getUserId(req) {
  // 1. Check if user is logged into Clerk
  try {
    const session = await auth()
    if (session && session.userId) {
      return session.userId
    }
  } catch {
    // Guest / non-authenticated context
  }

  if (!req) return 'anonymous_default'

  // 2. Check custom header (from apiFetch for guests)
  const headerId = req.headers.get('x-user-id')
  if (headerId && headerId.trim() !== '') {
    return headerId.trim()
  }

  // 3. Check cookies
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const match = cookieHeader.match(/tracked_user_id=([^;]+)/)
    if (match && match[1]) {
      return decodeURIComponent(match[1].trim())
    }
  } catch {
    // ignore
  }

  // 4. Check query param
  try {
    const url = new URL(req.url)
    const queryId = url.searchParams.get('user_id')
    if (queryId && queryId.trim() !== '') {
      return queryId.trim()
    }
  } catch {
    // ignore
  }

  return 'anonymous_default'
}
