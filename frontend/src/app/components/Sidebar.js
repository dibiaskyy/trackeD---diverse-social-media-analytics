"use client"

import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from '../lib/ThemeContext'
import styles from '../styles/Sidebar.module.css'

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

function IconAnalytics() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18.5 9l-5 5-3-3-4.5 4.5" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 110 2.83 2 2 0 010-2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" />
    </svg>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo} onClick={() => router.push('/')}>
        <div className={styles.logoMark}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-logo-icon)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span className={styles.logoText}>trackeD</span>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <button
          className={`${styles.navItem} ${pathname === '/' ? styles.navItemActive : ''}`}
          onClick={() => router.push('/')}
          title="Dashboard"
          id="nav-dashboard"
        >
          <span className={styles.navIcon}><IconDashboard /></span>
          <span className={styles.navLabel}>Dashboard</span>
        </button>

        <button
          className={`${styles.navItem} ${pathname.startsWith('/analytics') ? styles.navItemActive : ''}`}
          onClick={() => router.push('/analytics')}
          title="Analytics"
          id="nav-analytics"
        >
          <span className={styles.navIcon}><IconAnalytics /></span>
          <span className={styles.navLabel}>Analytics</span>
        </button>

        <button
          className={`${styles.navItem} ${pathname.startsWith('/settings') ? styles.navItemActive : ''}`}
          onClick={() => router.push('/settings')}
          title="Settings"
          id="nav-settings"
        >
          <span className={styles.navIcon}><IconSettings /></span>
          <span className={styles.navLabel}>Settings</span>
        </button>
      </nav>

      {/* Theme Switcher in Sidebar */}
      <div className={styles.themeSection}>
        <button
          className={styles.themeToggleBtn}
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          id="theme-toggle-btn"
        >
          <span className={styles.navIcon}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </span>
          <span className={styles.navLabel}>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>

      {/* Platform legend */}
      <div className={styles.platforms}>
        <p className={styles.platformsLabel}>Platforms</p>
        <div className={styles.platformBadge} style={{ color: 'var(--color-tiktok)' }}>
          <TikTokIcon />
          <span>TikTok</span>
          <span className={styles.platformStatus}>✓</span>
        </div>
        <div className={styles.platformBadge} style={{ color: 'var(--color-youtube)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.81 3.02 3.02 0 002.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.81zM9.75 15.52V8.48L15.5 12l-5.75 3.52z" />
          </svg>
          <span>YouTube</span>
          <span className={styles.platformStatus}>✓</span>
        </div>
        <div className={styles.platformBadge} style={{ color: 'var(--color-facebook)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>Facebook</span>
          <span className={styles.platformStatus}>✓</span>
        </div>
      </div>

      {/* User Attribution & Version Footer */}
      <div className={styles.sidebarFooter}>
        <a
          href="https://github.com/dibiaskyy"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubLink}
          title="View dibiaskyy on GitHub"
        >
          <svg className={styles.githubIcon} viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <span>@dibiaskyy</span>
        </a>

        <div className={styles.sidebarMeta}>
          <span className={styles.attribution}>Developed by <strong>dibiaskyy</strong></span>
          <span className={styles.versionTag}>2026 trackeD v.1</span>
        </div>
      </div>
    </aside>
  )
}