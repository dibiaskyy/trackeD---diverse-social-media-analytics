"use client"

import { useState, useEffect } from 'react'
import { useToast, ToastContainer } from '../components/Toast'
import { useTheme } from '../lib/ThemeContext'
import styles from '../styles/Settings.module.css'

export default function SettingsPage() {
  const { toasts, addToast } = useToast()
  const { theme, setTheme } = useTheme()

  // Preferences (stored in localStorage)
  const [numberFormat, setNumberFormat] = useState('full')
  const [defaultSort, setDefaultSort] = useState('newest')
  const [defaultFilter, setDefaultFilter] = useState('all')

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedFormat = localStorage.getItem('sma_pref_format')
      const savedSort = localStorage.getItem('sma_pref_sort')
      const savedFilter = localStorage.getItem('sma_pref_filter')

      if (savedFormat) setNumberFormat(savedFormat)
      if (savedSort) setDefaultSort(savedSort)
      if (savedFilter) setDefaultFilter(savedFilter)
    } catch {
      // ignore localStorage disabled
    }
  }, [])

  const handleSavePref = (key, val, setter) => {
    setter(val)
    try {
      localStorage.setItem(key, val)
      addToast('Preference saved successfully', 'success')
    } catch {
      addToast('Failed to save to local storage', 'error')
    }
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    addToast(`Theme switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info')
  }

  const handleResetPreferences = () => {
    try {
      localStorage.removeItem('sma_pref_format')
      localStorage.removeItem('sma_pref_sort')
      localStorage.removeItem('sma_pref_filter')
      setNumberFormat('full')
      setDefaultSort('newest')
      setDefaultFilter('all')
      setTheme('dark')
      addToast('Preferences reset to default', 'info')
    } catch {
      addToast('Error resetting preferences', 'error')
    }
  }

  return (
    <main className={styles.page}>
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Preferences</h1>
        <p className={styles.pageSubtitle}>
          Customize display formatting, theme appearance, and default dashboard views
        </p>
      </div>

      {/* Display & Dashboard Preferences Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Display & Dashboard Preferences</h2>
            <p className={styles.cardSubtitle}>Settings are saved automatically to your browser</p>
          </div>
        </div>

        <div>
          {/* Theme Appearance Mode */}
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Appearance Theme</span>
              <span className={styles.settingDesc}>Select your preferred visual mode (Dark Obsidian or Clean Light)</span>
            </div>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className={styles.select}
              id="theme-select"
            >
              <option value="dark">🌙 Dark Mode (Obsidian)</option>
              <option value="light">☀️ Light Mode (Clean Slate)</option>
            </select>
          </div>

          {/* Number Notation */}
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Number Formatting</span>
              <span className={styles.settingDesc}>Choose how view, like, comment, and share counts appear</span>
            </div>
            <select
              value={numberFormat}
              onChange={(e) => handleSavePref('sma_pref_format', e.target.value, setNumberFormat)}
              className={styles.select}
            >
              <option value="full">Full Numbers (1,250,000)</option>
              <option value="compact">Compact Notation (1.25M)</option>
            </select>
          </div>

          {/* Default Sort */}
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Default Dashboard Sort</span>
              <span className={styles.settingDesc}>Initial ordering when loading the tracked posts list</span>
            </div>
            <select
              value={defaultSort}
              onChange={(e) => handleSavePref('sma_pref_sort', e.target.value, setDefaultSort)}
              className={styles.select}
            >
              <option value="newest">Newest First</option>
              <option value="views">Highest Views First</option>
              <option value="likes">Highest Likes First</option>
            </select>
          </div>

          {/* Default Platform Filter */}
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Default Platform Filter</span>
              <span className={styles.settingDesc}>Platform active by default when visiting the dashboard</span>
            </div>
            <select
              value={defaultFilter}
              onChange={(e) => handleSavePref('sma_pref_filter', e.target.value, setDefaultFilter)}
              className={styles.select}
            >
              <option value="all">All Platforms</option>
              <option value="tiktok">TikTok Only</option>
              <option value="youtube">YouTube Only</option>
              <option value="facebook">Facebook Only</option>
            </select>
          </div>
        </div>

        <div className={styles.cardFooter}>
          <button onClick={handleResetPreferences} className={styles.btnSecondary}>
            Reset to Defaults
          </button>
        </div>
      </div>
    </main>
  )
}
