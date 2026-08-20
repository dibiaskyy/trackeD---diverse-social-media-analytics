"use client"

import styles from '../styles/Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.leftCol}>
          <div className={styles.logoGroup}>
            <div className={styles.logoMark}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-logo-icon)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className={styles.brandName}>trackeD</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.userBadge} title="Authenticated Workspace User">
            <span className={styles.userAvatar}>D</span>
            <span className={styles.userName}>@dibiasky</span>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.statusPill}>
            <span className={styles.statusDot} />
            <span>Real-time Tracking Active</span>
          </div>

          <p className={styles.copyright}>
            © 2026 <strong>trackeD</strong> · Built for <strong>dibiasky</strong>
          </p>
        </div>
      </div>
    </footer>
  )
}
