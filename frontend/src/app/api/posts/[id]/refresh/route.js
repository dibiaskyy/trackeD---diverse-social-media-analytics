import { NextResponse } from 'next/server'
import { getPostById, addSnapshot } from '../../../../lib/db'
import { scrapeUrl } from '../../../../lib/scraper'

export async function POST(req, { params }) {
  try {
    const { id } = await params
    const postData = await getPostById(id)
    if (!postData) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
    }

    const stats = await scrapeUrl(postData.post.post_url)
    const updated = await addSnapshot(id, stats)

    return NextResponse.json({
      id: updated.post.id,
      platform: updated.post.platform,
      post_url: updated.post.post_url,
      caption: updated.post.caption,
      thumbnail_url: updated.post.thumbnail_url,
      track_until: updated.post.track_until,
      created_at: updated.post.created_at,
      posted_at: updated.post.posted_at,
      latest: updated.latest,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
