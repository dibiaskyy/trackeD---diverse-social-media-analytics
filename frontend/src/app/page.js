"use client"

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts'
import PostForm from './components/PostForm'
import PostCard from './components/PostCard'
import StatCard from './components/StatCard'
import { useToast, ToastContainer } from './components/Toast'
import { useTheme } from './lib/ThemeContext'
import { apiFetch } from './lib/authSession'
import styles from './styles/Dashboard.module.css'

const BAR_COLORS = ['#fafafa', '#d4d4d8', '#a1a1aa', '#71717a']

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'views', label: 'Most Views' },
  { key: 'likes', label: 'Most Likes' },
]

const PLATFORM_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'facebook', label: 'Facebook' },
]

export default function Dashboard() {
  const router = useRouter()
  const { isLoaded: isAuthLoaded, isSignedIn, user } = useUser()
  const [posts, setPosts] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [sort, setSort] = useState('newest')
  const [filter, setFilter] = useState('all')
  const [chartMode, setChartMode] = useState('engagement')
  const [refreshingAll, setRefreshingAll] = useState(false)
  const { toasts, addToast } = useToast()
  const { theme } = useTheme()

  // Detect connected providers from Clerk
  const externalAccounts = user?.externalAccounts || []
  const hasGoogle = isSignedIn && (
    externalAccounts.some((acc) =>
      acc.provider?.toLowerCase().includes('google') ||
      acc.verification?.strategy?.toLowerCase().includes('google')
    ) ||
    (user?.primaryEmailAddress?.emailAddress?.toLowerCase().endsWith('@gmail.com') ?? false)
  )

  const hasFacebook = isSignedIn && (
    externalAccounts.some((acc) =>
      acc.provider?.toLowerCase().includes('facebook') ||
      acc.verification?.strategy?.toLowerCase().includes('facebook')
    )
  )

  useEffect(() => {
    if (isAuthLoaded && !isSignedIn) {
      const hasGuestCookie = typeof document !== 'undefined' && document.cookie.includes('tracked_guest_session=true')
      const dismissed = typeof window !== 'undefined' && localStorage.getItem('tracked_welcome_dismissed')
      if (!hasGuestCookie && !dismissed) {
        router.push('/welcome')
      }
    }
  }, [isAuthLoaded, isSignedIn, router])

  useEffect(() => {
    apiFetch('/api/posts')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to load posts:', err)
        setPosts([])
      })
      .finally(() => setLoaded(true))
  }, [])

  const handlePostAdded = (newPost) => {
    setPosts((prev) => [newPost, ...(Array.isArray(prev) ? prev : [])])
    addToast('Post added and tracking started!', 'success')
  }

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) =>
      (Array.isArray(prev) ? prev : []).map((p) => (p.id === updatedPost.id ? updatedPost : p))
    )
  }

  const handlePostDeleted = (deletedId) => {
    setPosts((prev) => (Array.isArray(prev) ? prev : []).filter((p) => p.id !== deletedId))
    addToast('Post untracked and removed', 'info')
  }

  const handleRefreshAll = async () => {
    setRefreshingAll(true)
    addToast('Refreshing all posts…', 'info')
    const currentPosts = Array.isArray(posts) ? posts : []
    try {
      const results = await Promise.allSettled(
        currentPosts.map((p) =>
          apiFetch(`/api/posts/${p.id}/refresh`, { method: 'POST' })
            .then((r) => r.json())
        )
      )
      const updated = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && !r.value?.message) {
          updated.push(r.value)
        }
      })
      if (updated.length > 0) {
        setPosts((prev) =>
          (Array.isArray(prev) ? prev : []).map((p) => {
            const u = updated.find((u) => u.id === p.id)
            return u || p
          })
        )
        addToast(`Refreshed ${updated.length} post${updated.length > 1 ? 's' : ''}`, 'success')
      } else {
        addToast('No posts were updated', 'info')
      }
    } catch {
      addToast('Some refreshes failed', 'error')
    } finally {
      setRefreshingAll(false)
    }
  }

  const postList = Array.isArray(posts) ? posts : []

  const totals = postList.reduce(
    (acc, p) => ({
      views: acc.views + (p.latest?.views ?? 0),
      likes: acc.likes + (p.latest?.likes ?? 0),
      comments: acc.comments + (p.latest?.comments ?? 0),
      shares: acc.shares + (p.latest?.shares ?? 0),
    }),
    { views: 0, likes: 0, comments: 0, shares: 0 }
  )

  const hasData = postList.some((p) => p.latest)

  const barData = [
    { name: 'Views', value: totals.views },
    { name: 'Likes', value: totals.likes },
    { name: 'Comments', value: totals.comments },
    { name: 'Shares', value: totals.shares },
  ]

  // Filter + sort
  const filteredPosts = useMemo(() => {
    let result = filter === 'all' ? postList : postList.filter((p) => p.platform === filter)
    return [...result].sort((a, b) => {
      if (sort === 'views') return (b.latest?.views ?? 0) - (a.latest?.views ?? 0)
      if (sort === 'likes') return (b.latest?.likes ?? 0) - (a.latest?.likes ?? 0)
      return new Date(b.created_at) - new Date(a.created_at) // newest
    })
  }, [postList, sort, filter])

  const tiktokCount = postList.filter((p) => p.platform === 'tiktok').length
  const youtubeCount = postList.filter((p) => p.platform === 'youtube').length
  const facebookCount = postList.filter((p) => p.platform === 'facebook').length

  return (
    <main className={styles.page}>
      <ToastContainer toasts={toasts} />

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.greeting}>{getGreeting()}, Creator</h1>
          <p className={styles.pageSubtitle}>
            Tracking {posts.length} post{posts.length !== 1 ? 's' : ''} across TikTok, YouTube, and Facebook
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statGrid}>
        <StatCard label="Total Views"    value={totals.views.toLocaleString()} accent />
        <StatCard label="Total Likes"    value={totals.likes.toLocaleString()} />
        <StatCard label="Total Comments" value={totals.comments.toLocaleString()} />
        <StatCard label="Total Shares"   value={totals.shares.toLocaleString()} />
      </div>

      {/* Bar chart with mode toggle */}
      {hasData && (
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <h2 className={styles.chartTitle}>
              {chartMode === 'engagement' ? 'Engagement Breakdown (Likes, Comments, Shares)' : 'Totals at a glance (All Metrics)'}
            </h2>
            <div className={styles.chartTabs}>
              <button
                className={`${styles.chartTabBtn} ${chartMode === 'engagement' ? styles.chartTabBtnActive : ''}`}
                onClick={() => setChartMode('engagement')}
              >
                Engagement (Scaled)
              </button>
              <button
                className={`${styles.chartTabBtn} ${chartMode === 'all' ? styles.chartTabBtnActive : ''}`}
                onClick={() => setChartMode('all')}
              >
                All Metrics
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              data={
                chartMode === 'engagement'
                  ? [
                      { name: 'Likes', value: totals.likes },
                      { name: 'Comments', value: totals.comments },
                      { name: 'Shares', value: totals.shares },
                    ]
                  : [
                      { name: 'Views', value: totals.views },
                      { name: 'Likes', value: totals.likes },
                      { name: 'Comments', value: totals.comments },
                      { name: 'Shares', value: totals.shares },
                    ]
              }
              margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-text-tertiary)" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis
                stroke="var(--color-text-tertiary)"
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toLocaleString()}
                width={65}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  fontSize: 13,
                  boxShadow: 'var(--shadow-md)',
                }}
                labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--color-text-secondary)' }}
                formatter={(value) => [value.toLocaleString(), '']}
                cursor={{ fill: 'var(--color-accent-soft)' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={72} fill="var(--color-accent)">
                <LabelList
                  dataKey="value"
                  position="top"
                  fill="var(--color-text-secondary)"
                  fontSize={11}
                  offset={6}
                  formatter={(v) => v.toLocaleString()}
                />
                {(chartMode === 'engagement'
                  ? (theme === 'light' ? ['#18181b', '#52525b', '#71717a'] : ['#ffffff', '#d4d4d8', '#a1a1aa'])
                  : (theme === 'light' ? ['#18181b', '#52525b', '#71717a', '#a1a1aa'] : ['#ffffff', '#d4d4d8', '#a1a1aa', '#71717a'])
                ).map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add post form */}
      <PostForm onPostAdded={handlePostAdded} />

      {/* Section header — filters + sort + refresh all */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionLeft}>
          <h2 className={styles.sectionTitle}>Tracked Posts</h2>
          <span className={styles.postCount}>{posts.length}</span>
        </div>

        <div className={styles.sectionControls}>
          {/* Platform filter pills */}
          <div className={styles.filterPills} role="group" aria-label="Filter by platform">
            {PLATFORM_FILTERS.map((f) => {
              const count =
                f.key === 'all'
                  ? posts.length
                  : f.key === 'tiktok'
                  ? tiktokCount
                  : f.key === 'youtube'
                  ? youtubeCount
                  : facebookCount
              const isHighlightedPlatform =
                (hasGoogle && (f.key === 'youtube' || f.key === 'tiktok')) ||
                (hasFacebook && f.key === 'facebook')

              return (
                <button
                  key={f.key}
                  className={`${styles.pill} ${filter === f.key ? styles.pillActive : ''} ${isHighlightedPlatform && filter !== f.key ? styles.pillHighlighted : ''}`}
                  onClick={() => setFilter(f.key)}
                  id={`filter-${f.key}`}
                  title={isHighlightedPlatform ? `Connected & verified platform` : undefined}
                >
                  {f.label}
                  {isHighlightedPlatform && <span className={styles.connectedDot} />}
                  {count > 0 && <span className={styles.pillCount}>{count}</span>}
                </button>
              )
            })}
          </div>

          {/* Sort pills */}
          <div className={styles.filterPills} role="group" aria-label="Sort posts">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                className={`${styles.pill} ${sort === s.key ? styles.pillActive : ''}`}
                onClick={() => setSort(s.key)}
                id={`sort-${s.key}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Refresh All */}
          {posts.length > 0 && (
            <button
              className={styles.refreshAllBtn}
              onClick={handleRefreshAll}
              disabled={refreshingAll}
              id="refresh-all-btn"
            >
              {refreshingAll ? (
                <span className={styles.spinner} />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                </svg>
              )}
              {refreshingAll ? 'Refreshing…' : 'Refresh All'}
            </button>
          )}
        </div>
      </div>

      {/* Loading / empty state */}
      {!loaded && (
        <div className={styles.loadingState}>
          <span className={styles.spinner} />
          <span>Loading your posts…</span>
        </div>
      )}

      {loaded && posts.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-tertiary)' }}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>No posts tracked yet</h3>
          <p className={styles.emptyBody}>
            Paste a TikTok, YouTube, or Facebook link above to start tracking views, likes, comments, and shares over time.
          </p>
          <div className={styles.emptyExamples}>
            <code>https://www.tiktok.com/@user/video/123…</code>
            <code>https://www.youtube.com/watch?v=abc…</code>
            <code>https://www.facebook.com/share/r/xyz…</code>
          </div>
        </div>
      )}

      {loaded && posts.length > 0 && filteredPosts.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-tertiary)' }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className={styles.emptyBody}>No {filter} posts tracked yet.</p>
        </div>
      )}

      {/* Post list */}
      <div className={styles.postList}>
        {filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onPostUpdated={handlePostUpdated}
            onPostDeleted={handlePostDeleted}
            onRefreshSuccess={(msg) => addToast(msg, 'success')}
            onRefreshError={(msg) => addToast(msg, 'error')}
          />
        ))}
      </div>
    </main>
  )
}