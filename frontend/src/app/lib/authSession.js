/**
 * Manages unique anonymous user sessions per browser/device.
 */

const STORAGE_KEY = 'tracked_anonymous_user_id'

export function getAnonymousUserId() {
  if (typeof window === 'undefined') return 'anonymous_default'

  let userId = localStorage.getItem(STORAGE_KEY)
  if (!userId) {
    // Generate unique anonymous user ID (e.g. usr_m4x8q9z_1720000000000)
    const randomPart = Math.random().toString(36).substring(2, 11)
    const timePart = Date.now().toString(36)
    userId = `usr_${randomPart}_${timePart}`
    localStorage.setItem(STORAGE_KEY, userId)
  }

  // Also ensure cookie is set for any server-rendered requests
  try {
    document.cookie = `tracked_user_id=${userId}; path=/; max-age=31536000; SameSite=Lax`
  } catch {
    // ignore
  }

  return userId
}

/**
 * Custom fetch wrapper that automatically attaches the user ID header.
 */
export async function apiFetch(url, options = {}) {
  const userId = getAnonymousUserId()
  const headers = {
    ...(options.headers || {}),
    'x-user-id': userId,
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
