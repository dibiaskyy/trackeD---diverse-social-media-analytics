"use client"

import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/authSession'
import styles from '../styles/EditExpiryModal.module.css'

export default function EditExpiryModal({ isOpen, post, onSave, onClose }) {
  const [preset, setPreset] = useState('never')
  const [customDate, setCustomDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (post?.track_until) {
      setPreset('custom')
      const d = new Date(post.track_until)
      // Format as YYYY-MM-DDTHH:MM for datetime-local input
      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      setCustomDate(localIso)
    } else {
      setPreset('never')
      setCustomDate('')
    }
    setError('')
  }, [post, isOpen])

  if (!isOpen || !post) return null

  const computeTrackUntil = () => {
    if (preset === 'never') return null
    if (preset === 'custom') return customDate ? new Date(customDate).toISOString() : null

    const now = new Date()
    if (preset === '1d') now.setDate(now.getDate() + 1)
    if (preset === '3d') now.setDate(now.getDate() + 3)
    if (preset === '7d') now.setDate(now.getDate() + 7)
    if (preset === '14d') now.setDate(now.getDate() + 14)
    if (preset === '30d') now.setDate(now.getDate() + 30)

    return now.toISOString()
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')

    const trackUntil = computeTrackUntil()

    try {
      const res = await apiFetch(`/api/posts/${post.id}/expiry`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_until: trackUntil }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to update schedule')

      onSave(data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const currentDisplay = post.track_until
    ? new Date(post.track_until).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'No Expiration (Always Track)'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrapper}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h3 className={styles.title}>Track Duration & Auto-Untrack Schedule</h3>
        <p className={styles.subtitle}>
          Set when tracking should automatically stop and delete for this video.
        </p>

        <div className={styles.currentStatus}>
          <span>Current Schedule:</span>
          <span className={styles.currentVal}>{currentDisplay}</span>
        </div>

        <div className={styles.presetsGrid}>
          <button
            type="button"
            className={`${styles.presetBtn} ${preset === 'never' ? styles.presetBtnActive : ''}`}
            onClick={() => setPreset('never')}
          >
            No Expiration
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${preset === '1d' ? styles.presetBtnActive : ''}`}
            onClick={() => setPreset('1d')}
          >
            +1 Day
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${preset === '3d' ? styles.presetBtnActive : ''}`}
            onClick={() => setPreset('3d')}
          >
            +3 Days
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${preset === '7d' ? styles.presetBtnActive : ''}`}
            onClick={() => setPreset('7d')}
          >
            +7 Days
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${preset === '14d' ? styles.presetBtnActive : ''}`}
            onClick={() => setPreset('14d')}
          >
            +14 Days
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${preset === 'custom' ? styles.presetBtnActive : ''}`}
            onClick={() => setPreset('custom')}
          >
            Custom Date…
          </button>
        </div>

        {preset === 'custom' && (
          <div className={styles.customSection}>
            <label className={styles.customLabel} htmlFor="custom-expiry-input">
              Select Expiration Date & Time:
            </label>
            <input
              id="custom-expiry-input"
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className={styles.customInput}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--color-danger)', fontSize: 13, margin: '8px 0 0' }}>
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button onClick={onClose} disabled={loading} className={styles.cancelBtn}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className={styles.saveBtn} id="save-schedule-btn">
            {loading ? 'Saving…' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}
