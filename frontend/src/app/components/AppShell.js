"use client"

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import styles from '../styles/Dashboard.module.css'

export default function AppShell({ children }) {
  const pathname = usePathname()
  const isWelcomePage = pathname === '/welcome'

  if (isWelcomePage) {
    return <>{children}</>
  }

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.content}>{children}</div>
    </div>
  )
}
