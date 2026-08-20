"use client"

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { useTheme } from '../lib/ThemeContext'
import { exportAnalyticsToPdf } from '../lib/exportPdf'
import styles from '../styles/Analytics.module.css'

function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.81 3.02 3.02 0 002.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.81zM9.75 15.52V8.48L15.5 12l-5.75 3.52z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { theme } = useTheme()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeMetricTab, setActiveMetricTab] = useState('all')

  useEffect(() => {
    fetch('http://localhost:8000/api/posts')
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  // Aggregate computations
  const metrics = useMemo(() => {
    const totalViews = posts.reduce((acc, p) => acc + (p.latest?.views ?? 0), 0)
    const totalLikes = posts.reduce((acc, p) => acc + (p.latest?.likes ?? 0), 0)
    const totalComments = posts.reduce((acc, p) => acc + (p.latest?.comments ?? 0), 0)
    const totalShares = posts.reduce((acc, p) => acc + (p.latest?.shares ?? 0), 0)
    const totalInteractions = totalLikes + totalComments + totalShares
    const avgEngagementRate = totalViews > 0 ? ((totalInteractions / totalViews) * 100).toFixed(2) : '0.00'
    const avgViewsPerPost = posts.length > 0 ? Math.round(totalViews / posts.length) : 0

    // Platform breakdown
    const tiktokPosts = posts.filter((p) => p.platform === 'tiktok')
    const youtubePosts = posts.filter((p) => p.platform === 'youtube')
    const facebookPosts = posts.filter((p) => p.platform === 'facebook')

    const calcPlatform = (list) => {
      const v = list.reduce((acc, p) => acc + (p.latest?.views ?? 0), 0)
      const l = list.reduce((acc, p) => acc + (p.latest?.likes ?? 0), 0)
      const c = list.reduce((acc, p) => acc + (p.latest?.comments ?? 0), 0)
      const s = list.reduce((acc, p) => acc + (p.latest?.shares ?? 0), 0)
      const eng = v > 0 ? (((l + c + s) / v) * 100).toFixed(2) : '0.00'
      return { views: v, likes: l, comments: c, shares: s, eng, count: list.length }
    }

    const tiktokStats = calcPlatform(tiktokPosts)
    const youtubeStats = calcPlatform(youtubePosts)
    const facebookStats = calcPlatform(facebookPosts)

    // Dedicated single-metric comparison data sets with independent scales
    const viewsData = [
      { name: 'Views', TikTok: tiktokStats.views, YouTube: youtubeStats.views, Facebook: facebookStats.views }
    ]
    const likesData = [
      { name: 'Likes', TikTok: tiktokStats.likes, YouTube: youtubeStats.likes, Facebook: facebookStats.likes }
    ]
    const commentsData = [
      { name: 'Comments', TikTok: tiktokStats.comments, YouTube: youtubeStats.comments, Facebook: facebookStats.comments }
    ]
    const sharesData = [
      { name: 'Shares', TikTok: tiktokStats.shares, YouTube: youtubeStats.shares, Facebook: facebookStats.shares }
    ]

    // Leaderboard sorted by views
    const leaderboard = [...posts]
      .filter((p) => p.latest)
      .sort((a, b) => (b.latest?.views ?? 0) - (a.latest?.views ?? 0))
      .slice(0, 10)

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalInteractions,
      avgEngagementRate,
      avgViewsPerPost,
      tiktokStats,
      youtubeStats,
      facebookStats,
      viewsData,
      likesData,
      commentsData,
      sharesData,
      leaderboard,
    }
  }, [posts])

  const handleExportPdf = () => {
    exportAnalyticsToPdf(posts, metrics)
  }

  const tiktokBarColor = theme === 'light' ? '#09090b' : '#fafafa'
  const youtubeBarColor = theme === 'light' ? '#e02424' : '#ff0000'
  const facebookBarColor = '#1877f2'

  if (loading) {
    return (
      <main className={styles.page}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          <span className={styles.spinner} />
          <span>Loading performance analytics…</span>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Performance Analytics</h1>
          <p className={styles.pageSubtitle}>
            Independent metric scaling, cross-platform distribution, and verified engagement calculations
          </p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleExportPdf} className={styles.exportBtn} id="export-pdf-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Executive Summary Grid */}
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Reach (Views)</span>
          <span className={styles.statValue}>{metrics.totalViews.toLocaleString()}</span>
          <span className={styles.statSubtext}>Across {posts.length} tracked posts</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Interactions</span>
          <span className={styles.statValue}>{metrics.totalInteractions.toLocaleString()}</span>
          <span className={styles.statSubtext}>Likes, comments & shares</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Avg. Engagement Rate</span>
          <span className={styles.statValue}>{metrics.avgEngagementRate}%</span>
          <span className={styles.statSubtext}>Verified ERR calculation</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Avg. Views Per Post</span>
          <span className={styles.statValue}>{metrics.avgViewsPerPost.toLocaleString()}</span>
          <span className={styles.statSubtext}>Delivery per tracked post</span>
        </div>
      </div>

      {/* Platform Summary Cards */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Platform Share & Totals</h2>
        <div className={styles.platformGrid}>
          {/* TikTok */}
          <div className={`${styles.platformCard} ${styles.platformCardTiktok}`}>
            <div className={styles.platformHeader}>
              <div className={styles.platformTitleGroup}>
                <div className={`${styles.platformIcon} ${styles.platformIconTiktok}`}>
                  <TikTokIcon />
                </div>
                <div>
                  <h3 className={styles.platformName}>TikTok</h3>
                  <span className={styles.platformPostCount}>{metrics.tiktokStats.count} videos tracked</span>
                </div>
              </div>
            </div>
            <div className={styles.platformStatsList}>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Views</span>
                <span className={styles.platformStatVal}>{metrics.tiktokStats.views.toLocaleString()}</span>
              </div>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Likes</span>
                <span className={styles.platformStatVal}>{metrics.tiktokStats.likes.toLocaleString()}</span>
              </div>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Comments</span>
                <span className={styles.platformStatVal}>{metrics.tiktokStats.comments.toLocaleString()}</span>
              </div>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Shares</span>
                <span className={styles.platformStatVal}>{metrics.tiktokStats.shares.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* YouTube */}
          <div className={`${styles.platformCard} ${styles.platformCardYoutube}`}>
            <div className={styles.platformHeader}>
              <div className={styles.platformTitleGroup}>
                <div className={`${styles.platformIcon} ${styles.platformIconYoutube}`}>
                  <YouTubeIcon />
                </div>
                <div>
                  <h3 className={styles.platformName}>YouTube</h3>
                  <span className={styles.platformPostCount}>{metrics.youtubeStats.count} videos tracked</span>
                </div>
              </div>
            </div>
            <div className={styles.platformStatsList}>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Views</span>
                <span className={styles.platformStatVal}>{metrics.youtubeStats.views.toLocaleString()}</span>
              </div>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Likes</span>
                <span className={styles.platformStatVal}>{metrics.youtubeStats.likes.toLocaleString()}</span>
              </div>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Comments</span>
                <span className={styles.platformStatVal}>{metrics.youtubeStats.comments.toLocaleString()}</span>
              </div>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Shares</span>
                <span className={styles.platformStatVal}>N/A (Hidden by YT)</span>
              </div>
            </div>
          </div>

          {/* Facebook */}
          <div className={`${styles.platformCard} ${styles.platformCardFacebook}`}>
            <div className={styles.platformHeader}>
              <div className={styles.platformTitleGroup}>
                <div className={`${styles.platformIcon} ${styles.platformIconFacebook}`}>
                  <FacebookIcon />
                </div>
                <div>
                  <h3 className={styles.platformName}>Facebook</h3>
                  <span className={styles.platformPostCount}>{metrics.facebookStats.count} posts tracked</span>
                </div>
              </div>
            </div>
            <div className={styles.platformStatsList}>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Views</span>
                <span className={styles.platformStatVal}>{metrics.facebookStats.views.toLocaleString()}</span>
              </div>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Likes</span>
                <span className={styles.platformStatVal}>{metrics.facebookStats.likes.toLocaleString()}</span>
              </div>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Comments</span>
                <span className={styles.platformStatVal}>{metrics.facebookStats.comments.toLocaleString()}</span>
              </div>
              <div className={styles.platformStatItem}>
                <span className={styles.platformStatLabel}>Shares</span>
                <span className={styles.platformStatVal}>{metrics.facebookStats.shares.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Separated Metric Comparison Charts */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Separated Metric Distribution</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Each metric has its own independent auto-scaled Y-axis so likes, comments, and shares are never squished by large view counts.
            </p>
          </div>

          <div className={styles.metricTabs}>
            <button
              className={`${styles.metricTabBtn} ${activeMetricTab === 'all' ? styles.metricTabBtnActive : ''}`}
              onClick={() => setActiveMetricTab('all')}
            >
              All 4 Charts
            </button>
            <button
              className={`${styles.metricTabBtn} ${activeMetricTab === 'views' ? styles.metricTabBtnActive : ''}`}
              onClick={() => setActiveMetricTab('views')}
            >
              Views Only
            </button>
            <button
              className={`${styles.metricTabBtn} ${activeMetricTab === 'likes' ? styles.metricTabBtnActive : ''}`}
              onClick={() => setActiveMetricTab('likes')}
            >
              Likes Only
            </button>
            <button
              className={`${styles.metricTabBtn} ${activeMetricTab === 'comments' ? styles.metricTabBtnActive : ''}`}
              onClick={() => setActiveMetricTab('comments')}
            >
              Comments Only
            </button>
            <button
              className={`${styles.metricTabBtn} ${activeMetricTab === 'shares' ? styles.metricTabBtnActive : ''}`}
              onClick={() => setActiveMetricTab('shares')}
            >
              Shares Only
            </button>
          </div>
        </div>

        {posts.length > 0 && (
          <div className={styles.metricChartsGrid}>
            {/* 1. Views Chart */}
            {(activeMetricTab === 'all' || activeMetricTab === 'views') && (
              <div className={styles.singleMetricCard}>
                <div className={styles.chartCardHeader}>
                  <h3 className={styles.chartCardTitle}>Total Views (Reach)</h3>
                  <span className={styles.chartCardTotal}>{metrics.totalViews.toLocaleString()} total</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={metrics.viewsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-text-tertiary)" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--color-text-tertiary)" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString()} width={60} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13 }}
                      formatter={(v) => [v.toLocaleString(), 'Views']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                    <Bar dataKey="TikTok" fill={tiktokBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="YouTube" fill={youtubeBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="Facebook" fill={facebookBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 2. Likes Chart */}
            {(activeMetricTab === 'all' || activeMetricTab === 'likes') && (
              <div className={styles.singleMetricCard}>
                <div className={styles.chartCardHeader}>
                  <h3 className={styles.chartCardTitle}>Total Likes & Reactions</h3>
                  <span className={styles.chartCardTotal}>{metrics.totalLikes.toLocaleString()} total</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={metrics.likesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-text-tertiary)" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--color-text-tertiary)" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString()} width={50} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13 }}
                      formatter={(v) => [v.toLocaleString(), 'Likes']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                    <Bar dataKey="TikTok" fill={tiktokBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="YouTube" fill={youtubeBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="Facebook" fill={facebookBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 3. Comments Chart */}
            {(activeMetricTab === 'all' || activeMetricTab === 'comments') && (
              <div className={styles.singleMetricCard}>
                <div className={styles.chartCardHeader}>
                  <h3 className={styles.chartCardTitle}>Total Comments & Discussions</h3>
                  <span className={styles.chartCardTotal}>{metrics.totalComments.toLocaleString()} total</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={metrics.commentsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-text-tertiary)" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--color-text-tertiary)" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString()} width={50} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13 }}
                      formatter={(v) => [v.toLocaleString(), 'Comments']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                    <Bar dataKey="TikTok" fill={tiktokBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="YouTube" fill={youtubeBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="Facebook" fill={facebookBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 4. Shares Chart */}
            {(activeMetricTab === 'all' || activeMetricTab === 'shares') && (
              <div className={styles.singleMetricCard}>
                <div className={styles.chartCardHeader}>
                  <h3 className={styles.chartCardTitle}>Total Shares & Virality</h3>
                  <span className={styles.chartCardTotal}>{metrics.totalShares.toLocaleString()} total</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={metrics.sharesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-text-tertiary)" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--color-text-tertiary)" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString()} width={50} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13 }}
                      formatter={(v) => [v.toLocaleString(), 'Shares']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                    <Bar dataKey="TikTok" fill={tiktokBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="YouTube" fill={youtubeBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="Facebook" fill={facebookBarColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Explainer / Insights Cards */}
      <section className={styles.infoGrid}>
        {/* Engagement Rate Verification */}
        <div className={styles.infoCard}>
          <div className={styles.infoCardHeader}>
            <div className={styles.infoIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className={styles.infoCardTitle}>Verified Engagement Rate (ERR)</h3>
          </div>
          <p className={styles.infoBody}>
            The calculation uses the industry-standard <strong>Engagement Rate by Reach / Views (ERR)</strong> formula:
          </p>
          <div className={styles.formulaBox}>
            ERR = ((Likes + Comments + Shares) ÷ Views) × 100
          </div>
          <p className={styles.infoBody} style={{ fontSize: 12, margin: 0 }}>
            • <strong>TikTok & Facebook:</strong> Uses likes + comments + shares ÷ views.<br />
            • <strong>YouTube:</strong> Excludes shares because YouTube does not publicly display share counters.
          </p>
        </div>

        {/* Demographics & Studio Privacy Explainer */}
        <div className={styles.infoCard}>
          <div className={styles.infoCardHeader}>
            <div className={styles.infoIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className={styles.infoCardTitle}>Audience Demographics & Privacy</h3>
          </div>
          <p className={styles.infoBody}>
            <strong>Viewer age, gender, geography (countries/cities), and watch retention curves</strong> are private 1st-party creator data protected under global privacy laws (GDPR/COPPA).
          </p>
          <p className={styles.infoBody} style={{ fontSize: 12, margin: 0 }}>
            TikTok, YouTube Studio, and Meta only expose age/geography through <strong>authenticated Creator OAuth APIs</strong> for your own verified account, and never on public video links.
          </p>
        </div>
      </section>

      {/* Top Posts Leaderboard with Captions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Top Performing Content & Video Captions</h2>
        {metrics.leaderboard.length === 0 ? (
          <div className={styles.emptyState}>No tracked posts with metrics yet.</div>
        ) : (
          <div className={styles.leaderboardTable}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>Video & Caption</th>
                    <th>Views</th>
                    <th>Likes</th>
                    <th>Comments</th>
                    <th>Shares</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.leaderboard.map((p, idx) => (
                    <tr key={p.id} onClick={() => router.push(`/posts/${p.id}`)}>
                      <td>
                        <span className={`${styles.rankBadge} ${idx === 0 ? styles.rank1 : ''}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td>
                        <div className={styles.postCell}>
                          <div className={styles.postHeaderRow}>
                            <span className={`${styles.badge} ${p.platform === 'tiktok' ? styles.badgeTiktok : p.platform === 'facebook' ? styles.badgeFacebook : styles.badgeYoutube}`}>
                              {p.platform}
                            </span>
                            <span className={styles.urlText} title={p.post_url}>
                              {p.post_url.replace(/^https?:\/\/(www\.)?/, '')}
                            </span>
                          </div>
                          {p.caption && (
                            <span className={styles.captionText} title={p.caption}>
                              "{p.caption}"
                            </span>
                          )}
                        </div>
                      </td>
                      <td><strong>{(p.latest?.views ?? 0).toLocaleString()}</strong></td>
                      <td>{(p.latest?.likes ?? 0).toLocaleString()}</td>
                      <td>{(p.latest?.comments ?? 0).toLocaleString()}</td>
                      <td>{(p.latest?.shares ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
