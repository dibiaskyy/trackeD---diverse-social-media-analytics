"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPostThumbnail } from '../lib/format'
import { apiFetch } from '../lib/authSession'
import ConfirmModal from './ConfirmModal'
import EditExpiryModal from './EditExpiryModal'
import styles from '../styles/PostCard.module.css'

const STAT_ICONS = {
  views: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  likes: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  comments: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  shares: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
}

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function formatTimeRemaining(targetDate) {
  if (!targetDate) return null
  const diffMs = new Date(targetDate) - new Date()
  if (diffMs <= 0) return 'Expired'
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d ${hours}h left`
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${mins}m left`
}

export default function PostCard({ post, onPostUpdated, onPostDeleted, onRefreshSuccess, onRefreshError }) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [justRefreshed, setJustRefreshed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showExpiryModal, setShowExpiryModal] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleRefresh = async (e) => {
    e.stopPropagation()
    setRefreshing(true)

    try {
      const res = await apiFetch(`/api/posts/${post.id}/refresh`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to refresh')
      onPostUpdated(data)
      setJustRefreshed(true)
      onRefreshSuccess?.(`Refreshed: ${post.platform} post`)
      setTimeout(() => setJustRefreshed(false), 2000)
    } catch (err) {
      onRefreshError?.(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete post')
      setShowConfirm(false)
      onPostDeleted?.(post.id)
    } catch (err) {
      onRefreshError?.(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleCardClick = () => {
    router.push(`/posts/${post.id}`)
  }

  const latest = post.latest
  const isTikTok = post.platform === 'tiktok'
  const isYouTube = post.platform === 'youtube'
  const isFacebook = post.platform === 'facebook'
  const thumbnailUrl = getPostThumbnail(post)

  // Metrics to display: TikTok and Facebook always show Views, Likes, Comments, and Shares
  const hasShares = isTikTok || isFacebook
  const statList = [
    { key: 'views', label: 'Views', value: latest?.views },
    { key: 'likes', label: 'Likes', value: latest?.likes },
    { key: 'comments', label: 'Comments', value: latest?.comments },
    ...(hasShares ? [{ key: 'shares', label: 'Shares', value: latest?.shares }] : []),
  ]

  // Shorten URL for display
  const displayUrl = post.post_url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 55) + (post.post_url.length > 60 ? '…' : '')

  const accentClass = isTikTok
    ? styles.accentBarTiktok
    : isFacebook
    ? styles.accentBarFacebook
    : styles.accentBarYoutube

  const badgeClass = isTikTok
    ? styles.badgeTiktok
    : isFacebook
    ? styles.badgeFacebook
    : styles.badgeYoutube

  const thumbClass = isTikTok
    ? styles.thumbTiktok
    : isFacebook
    ? styles.thumbFacebook
    : styles.thumbYoutube

  const expiryText = formatTimeRemaining(post.track_until)

  return (
    <>
      <div
        className={styles.card}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      >
        {/* Platform accent bar */}
        <div className={`${styles.accentBar} ${accentClass}`} />

        <div className={styles.cardContent}>
          {/* Post Thumbnail */}
          <div className={styles.thumbnailContainer}>
            {thumbnailUrl && !imgError ? (
              <img
                src={thumbnailUrl}
                alt="Video Thumbnail"
                className={styles.thumbnailImg}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className={`${styles.thumbnailPlaceholder} ${thumbClass}`}>
                <PlayIcon />
                <span className={styles.thumbPlatformLabel}>{post.platform}</span>
              </div>
            )}
            <div className={styles.thumbOverlay}>
              <PlayIcon />
            </div>
          </div>

          {/* Post Details & Stats */}
          <div className={styles.mainInfo}>
            <div className={styles.header}>
              <span className={`${styles.badge} ${badgeClass}`}>
                {post.platform}
              </span>

              {expiryText && (
                <span
                  className={styles.expiryBadge}
                  title={`Auto-deletes on ${new Date(post.track_until).toLocaleString()} (Click to change)`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowExpiryModal(true)
                  }}
                >
                  ⏳ {expiryText}
                </span>
              )}

              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
                onClick={(e) => e.stopPropagation()}
              >
                {displayUrl}
                <ExternalLinkIcon />
              </a>

              <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className={`${styles.refreshButton} ${refreshing ? styles.refreshing : ''} ${justRefreshed ? styles.refreshed : ''}`}
                  title="Refresh stats"
                  id={`refresh-btn-${post.id}`}
                >
                  <RefreshIcon />
                </button>

                <button
                  onClick={() => setShowExpiryModal(true)}
                  className={styles.scheduleButton}
                  title={post.track_until ? `Tracking until ${new Date(post.track_until).toLocaleString()}` : "Set auto-untrack schedule"}
                  id={`schedule-btn-${post.id}`}
                >
                  <ClockIcon />
                </button>

                <button
                  onClick={() => setShowConfirm(true)}
                  className={styles.deleteButton}
                  title="Untrack and delete post"
                  id={`delete-btn-${post.id}`}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            {post.caption && (
              <p className={styles.postCaption} title={post.caption}>
                {post.caption}
              </p>
            )}

            {latest ? (
              <div className={`${styles.stats} ${hasShares ? styles.stats4Col : styles.stats3Col}`}>
                {statList.map(({ key, label, value }) => (
                  <div key={key} className={styles.stat}>
                    <span className={styles.statIcon}>{STAT_ICONS[key]}</span>
                    <span className={styles.statValue}>{(value ?? 0).toLocaleString()}</span>
                    <span className={styles.statLabel}>{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noData}>No data yet — click Refresh to fetch stats</p>
            )}

            <div className={styles.footer}>
              <span className={styles.viewDetail}>View details & history →</span>
              {post.created_at && (
                <span className={styles.since}>
                  Tracking since {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="Untrack & Delete Video?"
        description="Are you sure you want to stop tracking this video? All historical snapshot data for this post will be permanently deleted."
        confirmLabel="Untrack Post"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        loading={deleting}
      />

      <EditExpiryModal
        isOpen={showExpiryModal}
        post={post}
        onSave={(updated) => {
          if (updated.deleted) {
            onPostDeleted?.(post.id)
          } else {
            onPostUpdated?.(updated)
            onRefreshSuccess?.('Tracking schedule updated!')
          }
        }}
        onClose={() => setShowExpiryModal(false)}
      />
    </>
  )
}