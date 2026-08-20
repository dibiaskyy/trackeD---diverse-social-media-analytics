import { NextResponse } from 'next/server'
import { getAllPosts, createPost } from '../../lib/db'
import { detectPlatform, scrapeUrl } from '../../lib/scraper'

export async function GET() {
  try {
    const posts = await getAllPosts()
    return NextResponse.json(Array.isArray(posts) ? posts : [])
  } catch (err) {
    console.error('GET /api/posts error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
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

    let stats = null
    try {
      stats = await scrapeUrl(url)
    } catch (e) {
      console.warn('Initial scraping warning:', e.message)
    }

    const newPost = await createPost({
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
