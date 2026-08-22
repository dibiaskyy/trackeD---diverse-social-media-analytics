import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

const INITIAL_DATA = {
  posts: [],
}

let pool = null

function getPool() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl || !dbUrl.startsWith('mysql://')) return null

  if (!pool) {
    try {
      const urlObj = new URL(dbUrl)
      pool = mysql.createPool({
        host: urlObj.hostname,
        port: parseInt(urlObj.port || '3306', 10),
        user: decodeURIComponent(urlObj.username),
        password: decodeURIComponent(urlObj.password),
        database: urlObj.pathname.replace(/^\//, '') || 'defaultdb',
        ssl: {
          rejectUnauthorized: false,
        },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      })
    } catch (err) {
      console.warn('Failed to initialize MySQL pool:', err.message)
      pool = null
    }
  }
  return pool
}

// ----------------------------------------------------
// Fallback JSON DB Helpers (Local dev + safe on read-only Vercel)
// ----------------------------------------------------
function ensureJsonDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8')
    }
  } catch {
    // Silently ignore on read-only filesystems (e.g. Vercel)
  }
}

function readJsonDb() {
  ensureJsonDb()
  try {
    if (!fs.existsSync(DB_FILE)) return INITIAL_DATA
    const raw = fs.readFileSync(DB_FILE, 'utf-8')
    const data = JSON.parse(raw)
    const now = new Date()
    const valid = (data.posts || []).filter((p) => {
      if (!p.track_until) return true
      return new Date(p.track_until) > now
    })

    if (valid.length !== (data.posts || []).length) {
      data.posts = valid
      writeJsonDb(data)
    }

    return data
  } catch {
    return INITIAL_DATA
  }
}

function writeJsonDb(data) {
  try {
    ensureJsonDb()
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    if (process.env.VERCEL) {
      console.warn('Cannot write to JSON DB on Vercel read-only filesystem:', err.message)
    } else {
      console.error('Failed writing to local JSON DB:', err.message)
    }
  }
}

// ----------------------------------------------------
// Main DB Operations
// ----------------------------------------------------

export async function getAllPosts() {
  const db = getPool()
  if (db) {
    try {
      // Auto-prune expired track_until posts
      await db.execute('DELETE FROM tracked_posts WHERE track_until IS NOT NULL AND track_until < NOW()')

      const [posts] = await db.execute('SELECT * FROM tracked_posts ORDER BY created_at DESC')

      if (posts.length === 0) return []

      const postIds = posts.map((p) => p.id)
      const [snapshots] = await db.query(
        `SELECT s.* FROM post_snapshots s
         INNER JOIN (
           SELECT tracked_post_id, MAX(fetched_at) AS max_fetched
           FROM post_snapshots
           WHERE tracked_post_id IN (?)
           GROUP BY tracked_post_id
         ) latest_s ON s.tracked_post_id = latest_s.tracked_post_id AND s.fetched_at = latest_s.max_fetched`,
        [postIds]
      )

      const snapMap = {}
      for (const s of snapshots) {
        snapMap[s.tracked_post_id] = s
      }

      return posts.map((p) => {
        const latest = snapMap[p.id] || null
        return {
          id: p.id,
          platform: p.platform,
          post_url: p.post_url,
          caption: p.caption,
          thumbnail_url: p.thumbnail_url,
          track_until: p.track_until ? new Date(p.track_until).toISOString() : null,
          created_at: p.created_at ? new Date(p.created_at).toISOString() : null,
          posted_at: p.posted_at ? new Date(p.posted_at).toISOString() : null,
          latest: latest
            ? {
                views: Number(latest.views || 0),
                likes: Number(latest.likes || 0),
                comments: Number(latest.comments || 0),
                shares: Number(latest.shares || 0),
                fetched_at: latest.fetched_at ? new Date(latest.fetched_at).toISOString() : null,
              }
            : null,
        }
      })
    } catch (err) {
      console.warn('MySQL getAllPosts failed:', err.message)
      if (process.env.VERCEL) return []
    }
  }

  // Localhost JSON fallback
  const jsonDb = readJsonDb()
  return (jsonDb.posts || []).map((p) => {
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
            views: Number(latest.views || 0),
            likes: Number(latest.likes || 0),
            comments: Number(latest.comments || 0),
            shares: Number(latest.shares || 0),
            fetched_at: latest.fetched_at,
          }
        : null,
    }
  })
}

export async function getPostById(id) {
  const numericId = parseInt(id, 10)
  const db = getPool()

  if (db && !isNaN(numericId)) {
    try {
      const [rows] = await db.execute('SELECT * FROM tracked_posts WHERE id = ?', [numericId])
      const post = rows[0]

      if (post) {
        const [snapshots] = await db.execute(
          'SELECT * FROM post_snapshots WHERE tracked_post_id = ? ORDER BY fetched_at ASC',
          [numericId]
        )

        const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        let dayAgo = null
        let minDiff = Infinity
        for (const s of snapshots) {
          const d = Math.abs(new Date(s.fetched_at).getTime() - oneDayAgo.getTime())
          if (d < minDiff) {
            minDiff = d
            dayAgo = s
          }
        }

        const latestViews = latest ? Number(latest.views || 0) : 0
        const dayAgoViews = dayAgo ? Number(dayAgo.views || 0) : 0

        let growth = null
        if (latest && dayAgo && dayAgoViews > 0 && dayAgo !== latest) {
          growth = Number((((latestViews - dayAgoViews) / dayAgoViews) * 100).toFixed(1))
        }

        let engagementRate = null
        if (latest && latestViews > 0) {
          const likes = Number(latest.likes || 0)
          const comments = Number(latest.comments || 0)
          const shares = Number(latest.shares || 0)
          const interactions = post.platform === 'youtube' ? likes + comments : likes + comments + shares
          engagementRate = Number(((interactions / latestViews) * 100).toFixed(2))
        }

        return {
          post: {
            id: post.id,
            platform: post.platform,
            post_url: post.post_url,
            caption: post.caption,
            thumbnail_url: post.thumbnail_url,
            track_until: post.track_until ? new Date(post.track_until).toISOString() : null,
            created_at: post.created_at ? new Date(post.created_at).toISOString() : null,
            posted_at: post.posted_at ? new Date(post.posted_at).toISOString() : null,
          },
          latest: latest
            ? {
                views: latestViews,
                likes: Number(latest.likes || 0),
                comments: Number(latest.comments || 0),
                shares: Number(latest.shares || 0),
                fetched_at: latest.fetched_at ? new Date(latest.fetched_at).toISOString() : null,
              }
            : null,
          views_1d_ago: dayAgo ? dayAgoViews : null,
          growth_percent: growth,
          engagement_rate: engagementRate,
          snapshots: snapshots.map((s) => ({
            views: Number(s.views || 0),
            likes: Number(s.likes || 0),
            comments: Number(s.comments || 0),
            shares: Number(s.shares || 0),
            fetched_at: s.fetched_at ? new Date(s.fetched_at).toISOString() : null,
          })),
        }
      }
    } catch (err) {
      console.warn('MySQL getPostById failed:', err.message)
      if (process.env.VERCEL) return null
    }
  }

  // Localhost JSON fallback
  const jsonDb = readJsonDb()
  const post = (jsonDb.posts || []).find((p) => String(p.id) === String(id))
  if (!post) return null

  const snapshots = post.snapshots || []
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  let dayAgo = null
  let minDiff = Infinity
  for (const s of snapshots) {
    const d = Math.abs(new Date(s.fetched_at).getTime() - oneDayAgo.getTime())
    if (d < minDiff) {
      minDiff = d
      dayAgo = s
    }
  }

  const dayAgoViews = dayAgo ? Number(dayAgo.views || 0) : 0

  let growth = null
  if (latest && dayAgo && dayAgoViews > 0 && dayAgo !== latest) {
    growth = Number((((latest.views - dayAgoViews) / dayAgoViews) * 100).toFixed(1))
  }

  let engagementRate = null
  if (latest && latest.views > 0) {
    const interactions =
      post.platform === 'youtube'
        ? (latest.likes || 0) + (latest.comments || 0)
        : (latest.likes || 0) + (latest.comments || 0) + (latest.shares || 0)
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
          views: Number(latest.views || 0),
          likes: Number(latest.likes || 0),
          comments: Number(latest.comments || 0),
          shares: Number(latest.shares || 0),
          fetched_at: latest.fetched_at,
        }
      : null,
    views_1d_ago: dayAgo ? dayAgoViews : null,
    growth_percent: growth,
    engagement_rate: engagementRate,
    snapshots: snapshots.map((s) => ({
      views: Number(s.views || 0),
      likes: Number(s.likes || 0),
      comments: Number(s.comments || 0),
      shares: Number(s.shares || 0),
      fetched_at: s.fetched_at,
    })),
  }
}

export async function createPost({ platform, post_url, caption, thumbnail_url, track_until, posted_at, stats }) {
  const db = getPool()

  if (db) {
    try {
      const trimmedUrl = post_url.trim()
      const [existing] = await db.execute('SELECT id FROM tracked_posts WHERE post_url = ?', [trimmedUrl])

      if (existing.length > 0) {
        throw new Error('This video URL is already being tracked.')
      }

      const postCaption = caption || stats?.caption || null
      const postThumbnail = thumbnail_url || stats?.thumbnail_url || null
      const trackUntilDate = track_until ? new Date(track_until) : null
      const postedAtDate = posted_at || stats?.posted_at ? new Date(posted_at || stats?.posted_at) : null

      const [result] = await db.execute(
        `INSERT INTO tracked_posts (platform, post_url, caption, thumbnail_url, track_until, posted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [platform, trimmedUrl, postCaption, postThumbnail, trackUntilDate, postedAtDate]
      )

      const newId = result.insertId

      if (stats) {
        await db.execute(
          `INSERT INTO post_snapshots (tracked_post_id, views, likes, comments, shares, fetched_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [newId, stats.views || 0, stats.likes || 0, stats.comments || 0, stats.shares || 0]
        )
      }

      return await getPostById(newId)
    } catch (err) {
      if (err.message.includes('already being tracked')) throw err
      console.warn('MySQL createPost failed:', err.message)
      if (process.env.VERCEL) {
        throw new Error('Database connection unavailable on server. Please check your database settings.')
      }
    }
  }

  // Localhost JSON fallback
  const jsonDb = readJsonDb()
  const existing = (jsonDb.posts || []).find((p) => p.post_url.trim().toLowerCase() === post_url.trim().toLowerCase())
  if (existing) {
    throw new Error('This video URL is already being tracked.')
  }

  const maxId = (jsonDb.posts || []).reduce((max, p) => Math.max(max, p.id || 0), 0)
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

  if (!jsonDb.posts) jsonDb.posts = []
  jsonDb.posts.unshift(newPost)
  writeJsonDb(jsonDb)

  return await getPostById(newId)
}

export async function addSnapshot(postId, stats) {
  const numericId = parseInt(postId, 10)
  const db = getPool()

  if (db && !isNaN(numericId)) {
    try {
      await db.execute(
        `INSERT INTO post_snapshots (tracked_post_id, views, likes, comments, shares, fetched_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [numericId, stats.views || 0, stats.likes || 0, stats.comments || 0, stats.shares || 0]
      )

      if (stats.caption || stats.thumbnail_url || stats.posted_at) {
        await db.execute(
          `UPDATE tracked_posts
           SET caption = COALESCE(caption, ?),
               thumbnail_url = COALESCE(thumbnail_url, ?),
               posted_at = COALESCE(posted_at, ?),
               updated_at = NOW()
           WHERE id = ?`,
          [
            stats.caption || null,
            stats.thumbnail_url || null,
            stats.posted_at ? new Date(stats.posted_at) : null,
            numericId,
          ]
        )
      }

      return await getPostById(numericId)
    } catch (err) {
      console.warn('MySQL addSnapshot failed:', err.message)
      if (process.env.VERCEL) return null
    }
  }

  // Localhost JSON fallback
  const jsonDb = readJsonDb()
  const post = (jsonDb.posts || []).find((p) => String(p.id) === String(postId))
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

  writeJsonDb(jsonDb)
  return await getPostById(postId)
}

export async function updatePostExpiry(postId, trackUntil) {
  const numericId = parseInt(postId, 10)
  const db = getPool()

  if (db && !isNaN(numericId)) {
    try {
      const trackUntilDate = trackUntil ? new Date(trackUntil) : null
      await db.execute(
        'UPDATE tracked_posts SET track_until = ?, updated_at = NOW() WHERE id = ?',
        [trackUntilDate, numericId]
      )
      const postData = await getPostById(numericId)
      return postData?.post || null
    } catch (err) {
      console.warn('MySQL updatePostExpiry failed:', err.message)
      if (process.env.VERCEL) return null
    }
  }

  // Localhost JSON fallback
  const jsonDb = readJsonDb()
  const post = (jsonDb.posts || []).find((p) => String(p.id) === String(postId))
  if (!post) throw new Error('Post not found')

  post.track_until = trackUntil ? new Date(trackUntil).toISOString() : null
  writeJsonDb(jsonDb)
  return post
}

export async function deletePost(postId) {
  const numericId = parseInt(postId, 10)
  const db = getPool()

  if (db && !isNaN(numericId)) {
    try {
      await db.execute('DELETE FROM tracked_posts WHERE id = ?', [numericId])
      return true
    } catch (err) {
      console.warn('MySQL deletePost failed:', err.message)
      if (process.env.VERCEL) return false
    }
  }

  // Localhost JSON fallback
  const jsonDb = readJsonDb()
  const initialLen = (jsonDb.posts || []).length
  jsonDb.posts = (jsonDb.posts || []).filter((p) => String(p.id) !== String(postId))
  if (jsonDb.posts.length === initialLen) {
    throw new Error('Post not found')
  }
  writeJsonDb(jsonDb)
  return true
}
