"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { getPostThumbnail } from '../../lib/format'
import { useTheme } from '../../lib/ThemeContext'
import ConfirmModal from '../../components/ConfirmModal'
import EditExpiryModal from '../../components/EditExpiryModal'
import styles from '../../styles/PostDetail.module.css'

function EngagementArc({ rate }) {
  const pct = Math.min(parseFloat(rate) || 0, 100)

  return (
    <div className={styles.arcWrapper}>
      <svg width="96" height="56" viewBox="0 0 96 56">
        <path
          d="M 8 52 A 40 40 0 0 1 88 52"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M 8 52 A 40 40 0 0 1 88 52"
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 125.66} 125.66`}
        />
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#a1a1aa" />
          </linearGradient>
        </defs>
      </svg>
      <div className={styles.arcValue}>{rate}%</div>
      <div className={styles.arcLabel}>Engagement</div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.chartTooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color, margin: '2px 0', fontSize: 12 }}>
          {entry.name}: <strong>{entry.value?.toLocaleString()}</strong>
        </p>
      ))}
    </div>
  )
}

export default function PostDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { theme } = useTheme()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [imgError, setImgError] = useState(false)

  const fetchData = () => {
    setLoading(true)
    fetch(`http://localhost:8000/api/posts/${id}/history`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.message || 'Failed to load')
        setData(json)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [id])

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showExpiryModal, setShowExpiryModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeletePost = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`http://localhost:8000/api/posts/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete post')
      router.push('/')
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`http://localhost:8000/api/posts/${id}/refresh`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to refresh')
      fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.loadingState}>
        <span className={styles.spinner} />
        <span>Loading post data…</span>
      </div>
    </div>
  )
  if (error) return (
    <div className={styles.page}>
      <button onClick={() => router.push('/')} className={styles.backButton}>← Dashboard</button>
      <p className={styles.errorMsg}>{error}</p>
    </div>
  )
  if (!data) return null

  const { post, latest, growth_percent, engagement_rate, snapshots } = data
  const isTikTok = post.platform === 'tiktok'
  const isYouTube = post.platform === 'youtube'
  const isFacebook = post.platform === 'facebook'
  const thumbnailUrl = getPostThumbnail(post)

  // YouTube does not track shares — calculate engagement honestly without shares for YouTube
  const calculatedEngagement = isYouTube && latest?.views > 0
    ? (((latest.likes + latest.comments) / latest.views) * 100).toFixed(2)
    : engagement_rate

  const chartData = snapshots.map((s) => ({
    time: new Date(s.fetched_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    views: s.views,
    likes: s.likes,
  }))

  const postedAtText = post.posted_at
    ? new Date(post.posted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const trackingSinceText = new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const platformBlockClass = isTikTok
    ? styles.platformBlockTiktok
    : isFacebook
    ? styles.platformBlockFacebook
    : styles.platformBlockYoutube

  const badgeClass = isTikTok
    ? styles.badgeTiktok
    : isFacebook
    ? styles.badgeFacebook
    : styles.badgeYoutube

  return (
    <div className={styles.page}>
      {/* Back + Actions */}
      <div className={styles.topBar}>
        <button onClick={() => router.push('/')} className={styles.backButton} id="back-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </button>

        <div className={styles.topBarActions}>
          <button onClick={handleRefresh} disabled={refreshing} className={styles.refreshButton} id="detail-refresh-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? styles.spinning : ''}>
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>

          <button onClick={() => setShowExpiryModal(true)} className={styles.refreshButton} id="detail-schedule-btn" title="Edit per-video tracking schedule">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {post.track_until ? 'Edit Schedule' : 'Set Expiry'}
          </button>

          <button onClick={() => setShowDeleteModal(true)} className={styles.deleteButton} id="detail-delete-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Untrack Post
          </button>
        </div>
      </div>

      {/* Title row with video thumbnail */}
      <div className={styles.titleRow}>
        {thumbnailUrl && !imgError ? (
          <div className={styles.detailThumbnailBox}>
            <img
              src={thumbnailUrl}
              alt="Thumbnail"
              className={styles.detailThumbImg}
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className={`${styles.platformBlock} ${platformBlockClass}`}>
            {isTikTok ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" />
              </svg>
            ) : isFacebook ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.81 3.02 3.02 0 002.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.81zM9.75 15.52V8.48L15.5 12l-5.75 3.52z" />
              </svg>
            )}
          </div>
        )}

        <div className={styles.titleInfo}>
          <span className={`${styles.badge} ${badgeClass}`}>
            {post.platform}
          </span>
          {post.track_until && (
            <span
              className={styles.expiryBadge}
              style={{ cursor: 'pointer' }}
              onClick={() => setShowExpiryModal(true)}
              title="Click to change auto-untrack schedule"
            >
              ⏳ Auto-deletes on {new Date(post.track_until).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          {post.caption && (
            <h2 className={styles.captionBox}>{post.caption}</h2>
          )}
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.url}
          >
            <span className={styles.urlText}>{post.post_url}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          <p className={styles.dateLine}>
            {postedAtText ? `Posted ${postedAtText}` : 'Publish date unknown'} · Tracking since {trackingSinceText}
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Untrack & Delete Video?"
        description="Are you sure you want to stop tracking this video? All historical snapshot data for this post will be permanently deleted."
        confirmLabel="Untrack Post"
        onConfirm={handleDeletePost}
        onCancel={() => setShowDeleteModal(false)}
        loading={deleting}
      />

      <EditExpiryModal
        isOpen={showExpiryModal}
        post={post}
        onSave={(updated) => {
          if (updated.deleted) {
            router.push('/')
          } else {
            setData((prev) => ({
              ...prev,
              post: { ...prev.post, track_until: updated.track_until },
            }))
          }
        }}
        onClose={() => setShowExpiryModal(false)}
      />

      {!latest ? (
        <p className={styles.status}>No data has been fetched for this post yet. Click Refresh above.</p>
      ) : (
        <>
          {/* Stats grid */}
          <div className={styles.statsGrid}>
            {/* Views with growth */}
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Views</span>
              <span className={styles.statValue}>{latest.views.toLocaleString()}</span>
              {growth_percent !== null ? (
                <span className={growth_percent >= 0 ? styles.up : styles.down}>
                  {growth_percent >= 0 ? '↑' : '↓'} {Math.abs(growth_percent)}% vs 1 day ago
                </span>
              ) : (
                <span className={styles.neutral}>Need 24h+ of data for growth</span>
              )}
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Likes</span>
              <span className={styles.statValue}>{latest.likes.toLocaleString()}</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Comments</span>
              <span className={styles.statValue}>{latest.comments.toLocaleString()}</span>
            </div>

            {/* Shares on TikTok and Facebook */}
            {(isTikTok || isFacebook) && (
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Shares</span>
                <span className={styles.statValue}>{latest.shares.toLocaleString()}</span>
              </div>
            )}

            {/* Engagement arc card */}
            <div className={`${styles.statCard} ${styles.statCardEngagement}`}>
              {calculatedEngagement !== null ? (
                <EngagementArc rate={calculatedEngagement} />
              ) : (
                <>
                  <span className={styles.statLabel}>Engagement Rate</span>
                  <span className={styles.statValue}>—</span>
                </>
              )}
              <span className={styles.neutral}>
                {isYouTube ? '(likes + comments) ÷ views' : '(likes + comments + shares) ÷ views'}
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className={styles.chartSection}>
            <div className={styles.chartHeader}>
              <h2 className={styles.sectionTitle}>Views & Likes over time</h2>
              <p className={styles.chartSubtitle}>
                {postedAtText
                  ? `Posted ${postedAtText} · showing data since tracking began (${trackingSinceText})`
                  : `Showing data since tracking began (${trackingSinceText})`}
              </p>
            </div>
            {chartData.length > 1 ? (
              <div className={styles.chartBox}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme === 'light' ? '#18181b' : '#ffffff'} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={theme === 'light' ? '#18181b' : '#ffffff'} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme === 'light' ? '#71717a' : '#a1a1aa'} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={theme === 'light' ? '#71717a' : '#a1a1aa'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                    <XAxis dataKey="time" stroke="var(--color-text-tertiary)" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis
                      stroke="var(--color-text-tertiary)"
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 'dataMax + 100']}
                      tickFormatter={(v) => v.toLocaleString()}
                      width={60}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)', paddingTop: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Views"
                      stroke={theme === 'light' ? '#18181b' : '#ffffff'}
                      strokeWidth={2}
                      fill="url(#viewsGrad)"
                      dot={{ r: 3, fill: theme === 'light' ? '#18181b' : '#ffffff' }}
                      activeDot={{ r: 5, fill: theme === 'light' ? '#18181b' : '#ffffff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="likes"
                      name="Likes"
                      stroke={theme === 'light' ? '#71717a' : '#a1a1aa'}
                      strokeWidth={1.75}
                      fill="url(#likesGrad)"
                      dot={{ r: 3, fill: theme === 'light' ? '#71717a' : '#a1a1aa' }}
                      activeDot={{ r: 5, fill: theme === 'light' ? '#71717a' : '#a1a1aa' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={styles.status}>
                Only one data point so far — refresh again later to build a real growth chart.
              </p>
            )}
          </div>

          {/* Snapshot history */}
          <div className={styles.historyTable}>
            <h2 className={styles.sectionTitle}>Snapshot history</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fetched at</th>
                    <th>Views</th>
                    <th>Likes</th>
                    <th>Comments</th>
                    {isTikTok && <th>Shares</th>}
                  </tr>
                </thead>
                <tbody>
                  {[...snapshots].reverse().map((s, i) => (
                    <tr key={i} className={i === 0 ? styles.latestRow : ''}>
                      <td>{new Date(s.fetched_at).toLocaleString()}</td>
                      <td>{s.views.toLocaleString()}</td>
                      <td>{s.likes.toLocaleString()}</td>
                      <td>{s.comments.toLocaleString()}</td>
                      {isTikTok && <td>{s.shares.toLocaleString()}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}