import { NextResponse } from 'next/server'
import { getPostById, deletePost } from '../../../lib/db'

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const postData = getPostById(id)
    if (!postData) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
    }
    return NextResponse.json(postData)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params
    deletePost(id)
    return NextResponse.json({ message: 'Post untracked and deleted successfully.' })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 })
  }
}
