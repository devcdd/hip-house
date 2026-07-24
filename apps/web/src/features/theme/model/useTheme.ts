import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const KEY = 'theme'

function stored(): Theme | null {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : null
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

// `theme` null = follow system. `resolved` is the effective theme for icons.
export function useTheme() {
  const [theme, setTheme] = useState<Theme | null>(stored)

  useEffect(() => {
    const root = document.documentElement
    if (theme) {
      root.dataset.theme = theme
      localStorage.setItem(KEY, theme)
    } else {
      delete root.dataset.theme
      localStorage.removeItem(KEY)
    }
  }, [theme])

  const resolved: Theme = theme ?? (systemDark() ? 'dark' : 'light')
  const toggle = () => setTheme(resolved === 'dark' ? 'light' : 'dark')

  return { resolved, toggle }
}
