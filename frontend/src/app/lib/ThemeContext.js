"use client"

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sma_theme')
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved)
        document.documentElement.setAttribute('data-theme', saved)
      } else {
        document.documentElement.setAttribute('data-theme', 'dark')
      }
    } catch {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    setMounted(true)
  }, [])

  const setTheme = (newTheme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem('sma_theme', newTheme)
    } catch {}
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
