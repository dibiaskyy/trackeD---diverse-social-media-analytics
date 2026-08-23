import { NextResponse } from 'next/server'
import { getAllPosts, createPost } from '../../lib/db'
import { detectPlatform, scrapeUrl } from '../../lib/scraper'
import { getUserId } from '../../lib/getUserId'

export async function GET(req) {
  try {
    const userId = await getUserId(req)
    const posts = await getAllPosts(userId)
    return NextResponse.json(Array.isArray(posts) ? posts : [])
  } catch (err) {
    console.error('GET /api/posts error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const userId = await getUserId(req)
    const body = await req.json()
    const url = body.url?.trim()
    const trackUntil = body.track_until || null

    if (!url) {
      return NextResponse.json({ error: 'URL is required.' }, { status: 422 })
    }

    const platform = detectPlatform(url)
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported platform. Please provide a TikTok, YouTube, or Facebook video URL.' },
        { status: 422 }
      )
    }

    // Provider Platform Approval Enforcement
    const authProvider = body.auth_provider
    if (authProvider === 'google' && platform === 'facebook') {
      return NextResponse.json(
        { error: 'Your account is connected with Google/Gmail. Only YouTube and TikTok links are approved for this account.' },
        { status: 422 }
      )
    }
    if (authProvider === 'facebook' && (platform === 'youtube' || platform === 'tiktok')) {
      return NextResponse.json(
        { error: 'Your account is connected with Facebook. Only Facebook links are approved for this account.' },
        { status: 422 }
      )
    }

    let stats = null
    try {
      stats = await scrapeUrl(url)
    } catch (e) {
      console.warn('Initial scraping warning:', e.message)
    }

    // Ownership / Creator Handle Verification
    const creatorHandle = body.creator_handle?.trim() || null
    if (creatorHandle && stats) {
      const cleanUserHandle = creatorHandle.replace(/^@/, '').toLowerCase().trim()
      const authorRaw = (stats.author || '').replace(/^@/, '').toLowerCase().trim()
      const handleRaw = (stats.author_handle || '').replace(/^@/, '').toLowerCase().trim()

      if (cleanUserHandle && (authorRaw || handleRaw)) {
        const matches =
          authorRaw === cleanUserHandle ||
          handleRaw === cleanUserHandle ||
          authorRaw.includes(cleanUserHandle) ||
          cleanUserHandle.includes(authorRaw) ||
          handleRaw.includes(cleanUserHandle)

        if (!matches) {
          const uploadedBy = stats.author_handle || stats.author || 'another creator'
          return NextResponse.json(
            {
              error: `This video was uploaded by ${uploadedBy}. You can only track videos from your own channel/account (@${cleanUserHandle}).`,
            },
            { status: 422 }
          )
        }
      }
    }

    const newPost = await createPost({
      user_id: userId,
      platform,
      post_url: url,
      track_until: trackUntil,
      stats,
    })

    const payload = newPost?.post || newPost
    return NextResponse.json(payload, { status: 201 })
  } catch (err) {
    console.error('POST /api/posts error:', err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
