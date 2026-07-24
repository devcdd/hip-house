import { useEffect, useRef } from 'react'

// Calls onReach when the returned sentinel ref scrolls into view.
// Disable (enabled=false) while loading or when no more pages remain.
export function useInfiniteScroll<T extends HTMLElement>(onReach: () => void, enabled: boolean) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onReach()
      },
      { rootMargin: '400px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onReach, enabled])
  return ref
}
