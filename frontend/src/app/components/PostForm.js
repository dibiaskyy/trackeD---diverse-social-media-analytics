"use client"

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { apiFetch } from '../lib/authSession'
import styles from '../styles/PostForm.module.css'

function TikTokIcon({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" />
    </svg>
  )
}

function YouTubeIcon({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.81 3.02 3.02 0 002.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.81zM9.75 15.52V8.48L15.5 12l-5.75 3.52z" />
    </svg>
  )
}

function FacebookIcon({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export default function PostForm({ onPostAdded }) {
  const { user, isSignedIn } = useUser()
  const [url, setUrl] = useState('')
  const [durationPreset, setDurationPreset] = useState('never')
  const [customDate, setCustomDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  // YouTube & TikTok Handle states
  const [youtubeHandle, setYoutubeHandle] = useState('')
  const [tiktokHandle, setTiktokHandle] = useState('')

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

  // Load and persist handles per user ID across logins
  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedYt =
      (user?.id && localStorage.getItem(`tracked_youtube_handle_${user.id}`)) ||
      localStorage.getItem('tracked_youtube_handle') ||
      ''

    const savedTt =
      (user?.id && localStorage.getItem(`tracked_tiktok_handle_${user.id}`)) ||
      localStorage.getItem('tracked_tiktok_handle') ||
      ''

    setYoutubeHandle(savedYt)
    setTiktokHandle(savedTt)
  }, [user?.id])

  const handleSaveYoutubeHandle = (val) => {
    setYoutubeHandle(val)
    if (typeof window !== 'undefined') {
      localStorage.setItem('tracked_youtube_handle', val)
      if (user?.id) {
        localStorage.setItem(`tracked_youtube_handle_${user.id}`, val)
      }
    }
  }

  const handleSaveTiktokHandle = (val) => {
    setTiktokHandle(val)
    if (typeof window !== 'undefined') {
      localStorage.setItem('tracked_tiktok_handle', val)
      if (user?.id) {
        localStorage.setItem(`tracked_tiktok_handle_${user.id}`, val)
      }
    }
  }

  const computeTrackUntil = () => {
    if (durationPreset === 'never') return null
    if (durationPreset === 'custom') return customDate ? new Date(customDate).toISOString() : null

    const now = new Date()
    if (durationPreset === '1d') now.setDate(now.getDate() + 1)
    if (durationPreset === '3d') now.setDate(now.getDate() + 3)
    if (durationPreset === '7d') now.setDate(now.getDate() + 7)
    if (durationPreset === '14d') now.setDate(now.getDate() + 14)
    if (durationPreset === '30d') now.setDate(now.getDate() + 30)

    return now.toISOString()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmed = url.trim()
    if (!trimmed) {
      setError('Please paste a post link.')
      return
    }

    let detectedPlatform = null
    if (/tiktok\.com/.test(trimmed)) detectedPlatform = 'tiktok'
    else if (/youtube\.com|youtu\.be/.test(trimmed)) detectedPlatform = 'youtube'
    else if (/facebook\.com|fb\.watch|fb\.com/.test(trimmed)) detectedPlatform = 'facebook'

    if (!detectedPlatform) {
      setError('Only TikTok, YouTube, and Facebook video/post links are supported.')
      return
    }

    // Strict Provider Platform Approval Enforcement
    if (isSignedIn) {
      if (hasGoogle && !hasFacebook && detectedPlatform === 'facebook') {
        setError('Your account is signed in with Google/Gmail. Only YouTube and TikTok links are approved. To track Facebook posts, please sign in with Facebook.')
        return
      }

      if (hasFacebook && !hasGoogle && (detectedPlatform === 'youtube' || detectedPlatform === 'tiktok')) {
        const targetName = detectedPlatform === 'youtube' ? 'YouTube' : 'TikTok'
        setError(`Your account is signed in with Facebook. Only Facebook links are approved. To track ${targetName} posts, please sign in with Google/Gmail.`)
        return
      }

      // Mandatory Username / Handle Verification before tracking
      if (detectedPlatform === 'youtube' && !youtubeHandle.trim()) {
        setError('Please enter your YouTube Channel handle (@channelName) above before tracking.')
        return
      }
      if (detectedPlatform === 'tiktok' && !tiktokHandle.trim()) {
        setError('Please enter your TikTok username (@username) above before tracking.')
        return
      }
      if (!youtubeHandle.trim() && !tiktokHandle.trim()) {
        setError('Please enter your YouTube handle or TikTok username above before tracking.')
        return
      }
    }

    // Select the appropriate creator handle based on target platform ONLY if user is signed in
    let targetHandle = undefined
    if (isSignedIn) {
      if (detectedPlatform === 'youtube' && youtubeHandle.trim()) {
        targetHandle = youtubeHandle.trim()
      } else if (detectedPlatform === 'tiktok' && tiktokHandle.trim()) {
        targetHandle = tiktokHandle.trim()
      }
    }

    const trackUntil = computeTrackUntil()

    setLoading(true)
    try {
      const res = await apiFetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmed,
          track_until: trackUntil,
          creator_handle: targetHandle,
          auth_provider: hasGoogle && !hasFacebook ? 'google' : hasFacebook && !hasGoogle ? 'facebook' : 'all',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Something went wrong')
      }

      onPostAdded(data)
      setUrl('')
      setDurationPreset('never')
      setCustomDate('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isTikTokHighlighted = hasGoogle || (!isSignedIn && !hasFacebook)
  const isYouTubeHighlighted = hasGoogle || (!isSignedIn && !hasFacebook)
  const isFacebookHighlighted = hasFacebook || (!isSignedIn && !hasGoogle)

  const isTikTokLocked = isSignedIn && hasFacebook && !hasGoogle
  const isYouTubeLocked = isSignedIn && hasFacebook && !hasGoogle
  const isFacebookLocked = isSignedIn && hasGoogle && !hasFacebook

  // Required Handle missing detection for active state
  let currentDetectedPlatform = null
  if (/tiktok\.com/.test(url.trim())) currentDetectedPlatform = 'tiktok'
  else if (/youtube\.com|youtu\.be/.test(url.trim())) currentDetectedPlatform = 'youtube'
  else if (/facebook\.com|fb\.watch|fb\.com/.test(url.trim())) currentDetectedPlatform = 'facebook'

  const isUsernameMissing = Boolean(
    isSignedIn && (
      currentDetectedPlatform === 'youtube'
        ? !youtubeHandle.trim()
        : currentDetectedPlatform === 'tiktok'
        ? !tiktokHandle.trim()
        : !youtubeHandle.trim() && !tiktokHandle.trim()
    )
  )

  const inputPlaceholder = !isSignedIn
    ? 'Paste a TikTok, YouTube, or Facebook video/reel link…'
    : hasGoogle && !hasFacebook
    ? 'Paste a YouTube or TikTok video link (Google account connected)…'
    : hasFacebook && !hasGoogle
    ? 'Paste a Facebook reel/video link (Facebook account connected)…'
    : 'Paste a TikTok, YouTube, or Facebook video/reel link…'

  return (
    <div className={styles.wrapper}>
      {/* Top Banner indicating Provider Sync */}
      {isSignedIn && (
        <div className={styles.authBanner}>
          <div className={styles.authBannerLeft}>
            <span className={styles.authPulseDot}></span>
            {hasGoogle && !hasFacebook && (
              <span>
                <strong>Google Account Connected:</strong> Only YouTube & TikTok links approved
              </span>
            )}
            {hasFacebook && !hasGoogle && (
              <span>
                <strong>Facebook Account Connected:</strong> Only Facebook Reels & Videos approved
              </span>
            )}
            {hasGoogle && hasFacebook && (
              <span>
                <strong>Google & Facebook Connected:</strong> All platforms active & approved
              </span>
            )}
            {!hasGoogle && !hasFacebook && (
              <span>
                <strong>Account Synced:</strong> YouTube, TikTok & Facebook channels ready to track
              </span>
            )}
          </div>
        </div>
      )}

      <div className={styles.topRow}>
        {/* Platform Status Badges with Provider-Based Highlighting & Lock State */}
        <div className={styles.platformHints}>
          <span
            className={`${styles.hint} ${isTikTokHighlighted ? styles.hintHighlightedTikTok : isTikTokLocked ? styles.hintDisabled : styles.hintMuted}`}
            title={isTikTokLocked ? 'Locked: Requires Google Login' : hasGoogle ? 'Approved: Connected via Google' : 'TikTok platform'}
          >
            <TikTokIcon />
            <span>TikTok</span>
            {hasGoogle && <span className={styles.activePill}>Approved</span>}
            {isTikTokLocked && <span className={styles.lockedPill}>Locked</span>}
          </span>

          <span className={styles.hintSep}>·</span>

          <span
            className={`${styles.hint} ${isYouTubeHighlighted ? styles.hintHighlightedYouTube : isYouTubeLocked ? styles.hintDisabled : styles.hintMuted}`}
            title={isYouTubeLocked ? 'Locked: Requires Google Login' : hasGoogle ? 'Approved: Connected via Google' : 'YouTube platform'}
          >
            <YouTubeIcon />
            <span>YouTube</span>
            {hasGoogle && <span className={styles.activePill}>Approved</span>}
            {isYouTubeLocked && <span className={styles.lockedPill}>Locked</span>}
          </span>

          <span className={styles.hintSep}>·</span>

          <span
            className={`${styles.hint} ${isFacebookHighlighted ? styles.hintHighlightedFacebook : isFacebookLocked ? styles.hintDisabled : styles.hintMuted}`}
            title={isFacebookLocked ? 'Locked: Requires Facebook Login' : hasFacebook ? 'Approved: Connected via Facebook' : 'Facebook platform'}
          >
            <FacebookIcon />
            <span>Facebook</span>
            {hasFacebook && <span className={styles.activePillFb}>Approved</span>}
            {isFacebookLocked && <span className={styles.lockedPill}>Locked</span>}
          </span>
        </div>

        {/* Dual Channel Handles Section (Only shown when Signed In) */}
        {isSignedIn ? (
          <div className={styles.handlesContainer}>
            <div
              className={`${styles.handleBadgeWrapper} ${isYouTubeHighlighted ? styles.handleHighlightedYt : ''}`}
              title="YouTube videos will be verified against this channel handle"
            >
              <YouTubeIcon className={styles.handlePlatformIcon} />
              <span className={styles.handleLabel}>YouTube:</span>
              <input
                type="text"
                placeholder="@ytChannel"
                value={youtubeHandle}
                onChange={(e) => handleSaveYoutubeHandle(e.target.value)}
                className={styles.handleInput}
                id="youtube-handle-input"
              />
            </div>

            <div
              className={`${styles.handleBadgeWrapper} ${isTikTokHighlighted ? styles.handleHighlightedTt : ''}`}
              title="TikTok videos will be verified against this username"
            >
              <TikTokIcon className={styles.handlePlatformIcon} />
              <span className={styles.handleLabel}>TikTok:</span>
              <input
                type="text"
                placeholder="@tiktokUser"
                value={tiktokHandle}
                onChange={(e) => handleSaveTiktokHandle(e.target.value)}
                className={styles.handleInput}
                id="tiktok-handle-input"
              />
            </div>
          </div>
        ) : (
          <div className={styles.guestModeTag} title="Guest mode allows tracking any public video or reel without username verification">
            <span className={styles.guestDot}></span>
            <span>Guest: Any Public Link Allowed</span>
          </div>
        )}

        {/* Track Duration / Expiry Preset */}
        <div className={styles.durationWrapper}>
          <label className={styles.durationLabel} htmlFor="duration-select">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Track Until:
          </label>
          <select
            id="duration-select"
            value={durationPreset}
            onChange={(e) => setDurationPreset(e.target.value)}
            className={styles.durationSelect}
          >
            <option value="never">No Expiration</option>
            <option value="1d">1 Day</option>
            <option value="3d">3 Days</option>
            <option value="7d">7 Days</option>
            <option value="14d">14 Days</option>
            <option value="30d">30 Days</option>
            <option value="custom">Custom Date…</option>
          </select>

          {durationPreset === 'custom' && (
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className={styles.customDateInput}
              min={new Date().toISOString().slice(0, 16)}
            />
          )}
        </div>
      </div>

      {/* Notice when handle is missing for logged in users */}
      {isUsernameMissing && (
        <div className={styles.handleMissingNotice}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            {currentDetectedPlatform === 'youtube'
              ? 'Please input your YouTube Channel handle (@channel) above before tracking.'
              : currentDetectedPlatform === 'tiktok'
              ? 'Please input your TikTok username (@username) above before tracking.'
              : 'Please input your YouTube channel handle or TikTok username above to enable tracking.'}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`${styles.form} ${focused ? styles.formFocused : ''}`}>
        <div className={styles.inputWrapper}>
          <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder={inputPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={styles.input}
            id="post-url-input"
          />
        </div>
        <button
          type="submit"
          disabled={loading || isUsernameMissing}
          className={`${styles.button} ${isUsernameMissing ? styles.buttonDisabled : ''}`}
          id="track-post-btn"
          title={isUsernameMissing ? 'Please input your channel handle above first to enable tracking' : 'Track Post'}
        >
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {isUsernameMissing ? 'Input Handle First' : 'Track Post'}
            </>
          )}
        </button>
      </form>
      {error && (
        <p className={styles.error}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}