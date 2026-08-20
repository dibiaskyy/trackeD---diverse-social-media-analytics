"use client"

import { useState, useRef } from 'react'
import styles from '../styles/PostForm.module.css'

function TikTokIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-tiktok)' }}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-youtube)' }}>
      <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.81 3.02 3.02 0 002.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.81zM9.75 15.52V8.48L15.5 12l-5.75 3.52z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-facebook)' }}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export default function PostForm({ onPostAdded }) {
  const [url, setUrl] = useState('')
  const [durationPreset, setDurationPreset] = useState('never')
  const [customDate, setCustomDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

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

    if (!url.trim()) {
      setError('Please paste a post link.')
      return
    }

    const isValid = /tiktok\.com|youtube\.com|youtu\.be|facebook\.com|fb\.watch|fb\.com/.test(url)
    if (!isValid) {
      setError('Only TikTok, YouTube, and Facebook video/post links are supported.')
      return
    }

    const trackUntil = computeTrackUntil()

    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, track_until: trackUntil }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong')
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

  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <div className={styles.platformHints}>
          <span className={styles.hint}><TikTokIcon /> TikTok</span>
          <span className={styles.hintSep}>·</span>
          <span className={styles.hint}><YouTubeIcon /> YouTube</span>
          <span className={styles.hintSep}>·</span>
          <span className={styles.hint}><FacebookIcon /> Facebook</span>
        </div>

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
            <option value="never">No Expiration (Always Track)</option>
            <option value="1d">1 Day</option>
            <option value="3d">3 Days</option>
            <option value="7d">7 Days</option>
            <option value="14d">14 Days</option>
            <option value="30d">30 Days</option>
            <option value="custom">Custom Date & Time…</option>
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

      <form onSubmit={handleSubmit} className={`${styles.form} ${focused ? styles.formFocused : ''}`}>
        <div className={styles.inputWrapper}>
          <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Paste a TikTok, YouTube, or Facebook video/reel link…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={styles.input}
            id="post-url-input"
          />
        </div>
        <button type="submit" disabled={loading} className={styles.button} id="track-post-btn">
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Track Post
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