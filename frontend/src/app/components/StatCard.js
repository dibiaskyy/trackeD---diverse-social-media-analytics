"use client"

import { useEffect, useRef, useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useTheme } from '../lib/ThemeContext'
import styles from '../styles/StatCard.module.css'

const ICONS = {
  'Total Views': () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  'Total Likes': () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  'Total Comments': () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  'Total Shares': () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
}

const DESCRIPTIONS = {
  'Total Views': 'Cross-platform audience reach',
  'Total Likes': 'Audience appreciation & likes',
  'Total Comments': 'Discussions & replies',
  'Total Shares': 'TikTok & Facebook public shares',
}

function useCountUp(target, duration = 800) {
  const [count, setCount] = useState(0)
  const prevTarget = useRef(0)

  useEffect(() => {
    const start = prevTarget.current
    const end = typeof target === 'number' ? target : parseInt(target?.replace(/,/g, '') || '0', 10)
    prevTarget.current = end
    if (start === end) return

    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCount(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration])

  return count
}

export default function StatCard({ label, value, trend, accent = false, sparkData = [] }) {
  const { theme } = useTheme()
  const rawNum = parseInt(value?.replace?.(/,/g, '') || '0', 10)
  const animated = useCountUp(rawNum)
  const displayValue = isNaN(rawNum) ? value : animated.toLocaleString()
  const chartData = sparkData.length > 0 ? sparkData : [{ v: 10 }, { v: 25 }, { v: 18 }, { v: 32 }, { v: 45 }]
  const sparkStroke = theme === 'light' ? '#71717a' : 'rgba(255, 255, 255, 0.45)'

  return (
    <div className={`${styles.card} ${accent ? styles.cardAccent : ''}`}>
      <div className={styles.top}>
        <div className={styles.iconBox}>
          {ICONS[label]?.()}
        </div>
        {trend !== undefined ? (
          <span className={`${styles.trend} ${trend >= 0 ? styles.trendUp : styles.trendDown}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        ) : (
          <span className={styles.badgeLabel}>Live</span>
        )}
      </div>

      <div className={styles.middle}>
        <span className={styles.label}>{label}</span>
        <div className={styles.value}>{displayValue}</div>
        <p className={styles.description}>{DESCRIPTIONS[label] || 'Tracked metric'}</p>
      </div>

      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={32}>
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={sparkStroke}
              strokeWidth={1.75}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}