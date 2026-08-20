import Sidebar from './components/Sidebar'
import { ThemeProvider } from './lib/ThemeContext'
import './globals.css'
import styles from './styles/Dashboard.module.css'

export const metadata = {
  title: 'trackeD — Social Media Analytics',
  description: 'Real-time social media metrics and video analytics tracker for TikTok, YouTube, and Facebook.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className={styles.shell}>
            <Sidebar />
            <div className={styles.content}>{children}</div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}