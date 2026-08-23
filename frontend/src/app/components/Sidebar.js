"use client"

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SignInButton, UserButton, useUser, useClerk, useSignIn } from '@clerk/nextjs'
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
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const clerk = useClerk()
  const [fbLoading, setFbLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Detect connected social providers from Clerk
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

  const isTikTokHighlighted = hasGoogle || (!isSignedIn && !hasFacebook)
  const isYouTubeHighlighted = hasGoogle || (!isSignedIn && !hasFacebook)
  const isFacebookHighlighted = hasFacebook || (!isSignedIn && !hasGoogle)

  const handleGoogleOAuth = async () => {
    setGoogleLoading(true)
    try {
      if (clerk?.authenticateWithRedirect) {
        await clerk.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: '/',
        })
      } else {
        window.location.href = '/welcome'
      }
    } catch (err) {
      console.error('Google OAuth error:', err)
      setGoogleLoading(false)
    }
  }

  const handleFacebookOAuth = async () => {
    setFbLoading(true)
    try {
      if (clerk?.authenticateWithRedirect) {
        await clerk.authenticateWithRedirect({
          strategy: 'oauth_facebook',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: '/',
        })
      } else {
        window.location.href = '/welcome'
      }
    } catch (err) {
      console.error('Facebook OAuth error:', err)
      setFbLoading(false)
    }
  }

  const handleNav = (path) => {
    router.push(path)
    setMobileOpen(false)
  }

  const handleLogOut = async () => {
    try {
      document.cookie = 'tracked_guest_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      localStorage.removeItem('tracked_welcome_dismissed')
    } catch {
      // ignore
    }
    await signOut({ redirectUrl: '/welcome' })
  }

  return (
    <>
      {/* Mobile Top Header (<= 768px) */}
      <header className={styles.mobileHeader}>
        <div className={styles.mobileLogo} onClick={() => handleNav('/')}>
          <div className={styles.logoMark}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-logo-icon)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className={styles.logoText}>trackeD</span>
        </div>

        <div className={styles.mobileActions}>
          <button
            className={styles.mobileThemeBtn}
            onClick={toggleTheme}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          <button
            className={`${styles.hamburgerBtn} ${mobileOpen ? styles.hamburgerActive : ''}`}
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle Navigation Menu"
          >
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
          </button>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className={styles.mobileBackdrop} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar (Fixed on Desktop, Slide-out Drawer on Mobile) */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo */}
        <div className={styles.logo} onClick={() => handleNav('/')}>
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
            onClick={() => handleNav('/')}
            title="Dashboard"
            id="nav-dashboard"
          >
            <span className={styles.navIcon}><IconDashboard /></span>
            <span className={styles.navLabel}>Dashboard</span>
          </button>

          <button
            className={`${styles.navItem} ${pathname.startsWith('/analytics') ? styles.navItemActive : ''}`}
            onClick={() => handleNav('/analytics')}
            title="Analytics"
            id="nav-analytics"
          >
            <span className={styles.navIcon}><IconAnalytics /></span>
            <span className={styles.navLabel}>Analytics</span>
          </button>

          <button
            className={`${styles.navItem} ${pathname.startsWith('/settings') ? styles.navItemActive : ''}`}
            onClick={() => handleNav('/settings')}
            title="Settings"
            id="nav-settings"
          >
            <span className={styles.navIcon}><IconSettings /></span>
            <span className={styles.navLabel}>Settings</span>
          </button>
        </nav>

        {/* User Account / Guest Mode Section */}
        <div className={styles.accountSection}>
          {isLoaded && !isSignedIn && (
            <div className={styles.guestCard}>
              <div className={styles.guestHeader}>
                <span className={styles.guestBadge}>
                  <span className={styles.guestDot}></span>
                  Guest Mode
                </span>
              </div>
              <p className={styles.guestHint}>
                Sign in to sync your YouTube, TikTok, & Facebook posts.
              </p>
              <div className={styles.authButtonsStack}>
                <SignInButton mode="modal" asChild>
                  <button
                    className={styles.authSingleSignInBtn}
                    id="sidebar-signin-btn"
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    Sign In
                  </button>
                </SignInButton>
              </div>
            </div>
          )}

          {isLoaded && isSignedIn && (
            <div className={styles.signedInCard}>
              <UserButton
                afterSignOutUrl="/welcome"
                appearance={{
                  elements: {
                    userButtonAvatarBox: { width: '30px', height: '30px' },
                  },
                }}
              />
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {user?.firstName || user?.username || 'My Account'}
                </span>
                <span className={styles.userSyncBadge}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
                  </svg>
                  Cloud Synced
                </span>
              </div>
              <button
                onClick={handleLogOut}
                className={styles.logOutBtn}
                title="Log Out of Account"
                id="sidebar-logout-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          )}
        </div>

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
          <p className={styles.platformsLabel}>
            Platforms {isSignedIn && <span className={styles.syncStatusTag}>• Connected</span>}
          </p>

          <div
            className={`${styles.platformBadge} ${isTikTokHighlighted ? styles.platformHighlightedTt : styles.platformMuted}`}
            style={{ color: 'var(--color-tiktok)' }}
          >
            <TikTokIcon />
            <span>TikTok</span>
            {hasGoogle ? (
              <span className={styles.platformActivePulse}>● Active</span>
            ) : (
              <span className={styles.platformStatus}>✓</span>
            )}
          </div>

          <div
            className={`${styles.platformBadge} ${isYouTubeHighlighted ? styles.platformHighlightedYt : styles.platformMuted}`}
            style={{ color: 'var(--color-youtube)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.81 3.02 3.02 0 002.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.81zM9.75 15.52V8.48L15.5 12l-5.75 3.52z" />
            </svg>
            <span>YouTube</span>
            {hasGoogle ? (
              <span className={styles.platformActivePulse}>● Active</span>
            ) : (
              <span className={styles.platformStatus}>✓</span>
            )}
          </div>

          <div
            className={`${styles.platformBadge} ${isFacebookHighlighted ? styles.platformHighlightedFb : styles.platformMuted}`}
            style={{ color: 'var(--color-facebook)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>Facebook</span>
            {hasFacebook ? (
              <span className={styles.platformActivePulseFb}>● Active</span>
            ) : (
              <span className={styles.platformStatus}>✓</span>
            )}
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
    </>
  )
}