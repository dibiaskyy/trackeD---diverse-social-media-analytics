import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

// Initial empty state
const INITIAL_DATA = {
  posts: [],
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8')
  }
}

function readDb() {
  ensureDb()
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8')
    const data = JSON.parse(raw)
    // Auto-prune expired track_until posts
    const now = new Date()
    const valid = data.posts.filter((p) => {
      if (!p.track_until) return true
      return new Date(p.track_until) > now
    })

    if (valid.length !== data.posts.length) {
      data.posts = valid
      writeDb(data)
    }

    return data
  } catch {
    return INITIAL_DATA
  }
}

function writeDb(data) {
  ensureDb()
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export function getAllPosts() {
  const db = readDb()
  return db.posts.map((p) => {
    const latest = p.snapshots && p.snapshots.length > 0 ? p.snapshots[p.snapshots.length - 1] : null
    return {
      id: p.id,
      platform: p.platform,
      post_url: p.post_url,
      caption: p.caption,
      thumbnail_url: p.thumbnail_url,
      track_until: p.track_until,
      created_at: p.created_at,
      posted_at: p.posted_at,
      latest: latest
        ? {
            views: latest.views,
            likes: latest.likes,
            comments: latest.comments,
            shares: latest.shares,
            fetched_at: latest.fetched_at,
          }
        : null,
    }
  })
}

export function getPostById(id) {
  const db = readDb()
  const post = db.posts.find((p) => String(p.id) === String(id))
  if (!post) return null

  const snapshots = post.snapshots || []
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null

  // Find snapshot closest to 24h ago
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  let dayAgo = null
  let minDiff = Infinity
  for (const s of snapshots) {
    const d = Math.abs(new Date(s.fetched_at) - oneDayAgo)
    if (d < minDiff) {
      minDiff = d
      dayAgo = s
    }
  }

  let growth = null
  if (latest && dayAgo && dayAgo.views > 0 && dayAgo !== latest) {
    growth = Number((((latest.views - dayAgo.views) / dayAgo.views) * 100).toFixed(1))
  }

  let engagementRate = null
  if (latest && latest.views > 0) {
    const interactions =
      post.platform === 'youtube'
        ? latest.likes + latest.comments
        : latest.likes + latest.comments + latest.shares
    engagementRate = Number(((interactions / latest.views) * 100).toFixed(2))
  }

  return {
    post: {
      id: post.id,
      platform: post.platform,
      post_url: post.post_url,
      caption: post.caption,
      thumbnail_url: post.thumbnail_url,
      track_until: post.track_until,
      created_at: post.created_at,
      posted_at: post.posted_at,
    },
    latest: latest
      ? {
          views: latest.views,
          likes: latest.likes,
          comments: latest.comments,
          shares: latest.shares,
          fetched_at: latest.fetched_at,
        }
      : null,
    views_1d_ago: dayAgo?.views ?? null,
    growth_percent: growth,
    engagement_rate: engagementRate,
    snapshots: snapshots.map((s) => ({
      views: s.views,
      likes: s.likes,
      comments: s.comments,
      shares: s.shares,
      fetched_at: s.fetched_at,
    })),
  }
}

export function createPost({ platform, post_url, caption, thumbnail_url, track_until, posted_at, stats }) {
  const db = readDb()

  // Check if post_url already exists
  const existing = db.posts.find((p) => p.post_url.trim().toLowerCase() === post_url.trim().toLowerCase())
  if (existing) {
    throw new Error('This video URL is already being tracked.')
  }

  const maxId = db.posts.reduce((max, p) => Math.max(max, p.id || 0), 0)
  const newId = maxId + 1

  const newPost = {
    id: newId,
    platform,
    post_url,
    caption: caption || stats?.caption || null,
    thumbnail_url: thumbnail_url || stats?.thumbnail_url || null,
    track_until: track_until ? new Date(track_until).toISOString() : null,
    created_at: new Date().toISOString(),
    posted_at: posted_at || stats?.posted_at || null,
    snapshots: stats
      ? [
          {
            views: stats.views || 0,
            likes: stats.likes || 0,
            comments: stats.comments || 0,
            shares: stats.shares || 0,
            fetched_at: new Date().toISOString(),
          },
        ]
      : [],
  }

  db.posts.unshift(newPost)
  writeDb(db)

  return getPostById(newId)
}

export function addSnapshot(postId, stats) {
  const db = readDb()
  const post = db.posts.find((p) => String(p.id) === String(postId))
  if (!post) throw new Error('Post not found')

  if (!post.snapshots) post.snapshots = []

  post.snapshots.push({
    views: stats.views || 0,
    likes: stats.likes || 0,
    comments: stats.comments || 0,
    shares: stats.shares || 0,
    fetched_at: new Date().toISOString(),
  })

  if (stats.caption && !post.caption) post.caption = stats.caption
  if (stats.thumbnail_url) post.thumbnail_url = stats.thumbnail_url
  if (stats.posted_at && !post.posted_at) post.posted_at = stats.posted_at

  writeDb(db)
  return getPostById(postId)
}

export function updatePostExpiry(postId, trackUntil) {
  const db = readDb()
  const post = db.posts.find((p) => String(p.id) === String(postId))
  if (!post) throw new Error('Post not found')

  post.track_until = trackUntil ? new Date(trackUntil).toISOString() : null
  writeDb(db)
  return post
}

export function deletePost(postId) {
  const db = readDb()
  const initialLen = db.posts.length
  db.posts = db.posts.filter((p) => String(p.id) !== String(postId))
  if (db.posts.length === initialLen) {
    throw new Error('Post not found')
  }
  writeDb(db)
  return true
}
