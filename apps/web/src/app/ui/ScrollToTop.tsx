import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Reset window scroll to the top on route (path) changes — a plain BrowserRouter
// doesn't do this, so detail pages would otherwise open at the previous page's
// scroll offset (clamped to the bottom on shorter pages).
export function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType() // PUSH | POP | REPLACE

  useEffect(() => {
    if (navType === 'POP') return // back/forward: let the browser restore position
    window.scrollTo(0, 0)
  }, [pathname, navType])

  return null
}
