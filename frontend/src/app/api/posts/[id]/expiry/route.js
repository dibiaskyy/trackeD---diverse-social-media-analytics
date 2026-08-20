import { NextResponse } from 'next/server'
import { updatePostExpiry } from '../../../../lib/db'

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const body = await req.json()
    const trackUntil = body.track_until || null
    const updated = await updatePostExpiry(id, trackUntil)

    return NextResponse.json({
      message: 'Expiration schedule updated successfully.',
      post: updated,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
