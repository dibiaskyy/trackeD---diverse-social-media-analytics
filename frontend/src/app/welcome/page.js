"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignInButton, useUser, useSignIn } from '@clerk/nextjs'
import styles from '../styles/WelcomePage.module.css'

export default function WelcomePage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useUser()
  const { signIn, isLoaded: isSignInLoaded } = useSignIn()
  const [fbLoading, setFbLoading] = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/')
    }
  }, [isLoaded, isSignedIn, router])

  const handleFacebookOAuth = async () => {
    if (!isSignInLoaded || !signIn) return
    setFbLoading(true)
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_facebook',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      })
    } catch (err) {
      console.error('Facebook OAuth error:', err)
      setFbLoading(false)
    }
  }

  const handleContinueAsGuest = (e) => {
    e?.preventDefault?.()
    try {
      document.cookie = 'tracked_guest_session=true; path=/; max-age=2592000; SameSite=Lax'
      localStorage.setItem('tracked_welcome_dismissed', 'true')
    } catch {
      // ignore
    }
    window.location.href = '/'
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.welcomeCard}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          <div className={styles.logoMark}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-logo-icon)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <h1 className={styles.appTitle}>Welcome to trackeD</h1>
          <p className={styles.appSubtitle}>
            Real-time analytics & engagement tracker for YouTube, TikTok, and Facebook.
          </p>

          <div className={styles.platformPills}>
            <span className={styles.pill} style={{ color: 'var(--color-youtube)' }}>YouTube ✓</span>
            <span className={styles.pill} style={{ color: 'var(--color-tiktok)' }}>TikTok ✓</span>
            <span className={styles.pill} style={{ color: 'var(--color-facebook)' }}>Facebook ✓</span>
          </div>
        </div>

        {/* Action Body */}
        <div className={styles.cardBody}>
          <div className={styles.actionSection}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: '1.45' }}>
              💡 Sign in with the <strong>Google / Gmail</strong> account linked to your YouTube & TikTok channels (or your <strong>Facebook</strong> account) to automatically sync and verify all your posts.
            </div>

            {/* Main Sign In Button (Opens modal with Google, Facebook, and Email) */}
            <SignInButton mode="modal" asChild>
              <button className={styles.googleBtn} id="landing-signin-btn" type="button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Sign In
              </button>
            </SignInButton>
          </div>

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>or continue without account</span>
            <div className={styles.dividerLine} />
          </div>

          {/* Guest Mode Card Option */}
          <div className={styles.guestSection}>
            <div className={styles.guestHeader}>
              <span className={styles.guestTitle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Guest Mode
              </span>
              <span className={styles.guestBadge}>Browser Local</span>
            </div>
            <p className={styles.guestDescription}>
              Track public posts right now with zero sign-up. Your data will be stored securely in this browser.
            </p>
            <button
              onClick={handleContinueAsGuest}
              className={styles.guestActionBtn}
              id="landing-guest-btn"
              type="button"
            >
              Continue to Dashboard as Guest →
            </button>
          </div>
        </div>

        <div className={styles.cardFooter}>
          <span>trackeD v.1 · Developed by dibiaskyy · 2026</span>
        </div>
      </div>
    </div>
  )
}
