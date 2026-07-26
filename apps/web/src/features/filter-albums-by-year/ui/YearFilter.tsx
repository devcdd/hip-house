import { useEffect, useRef } from 'react'
import type { YearOption } from '../model/types'
import styles from './YearFilter.module.css'

interface Props {
  years: YearOption[]
  value: YearOption
  onChange: (year: YearOption) => void
}

// Horizontal swipe row (native touch scroll) — years no longer wrap and push
// the feed down. The active chip auto-centers itself.
export function YearFilter({ years, value, onChange }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [value])

  return (
    <div className={styles.tabs} role="tablist" aria-label="연도 필터">
      {years.map((y) => (
        <button
          key={y}
          ref={y === value ? activeRef : undefined}
          role="tab"
          aria-selected={y === value}
          className={y === value ? `${styles.tab} ${styles.active}` : styles.tab}
          onClick={() => onChange(y)}
        >
          {y}
        </button>
      ))}
    </div>
  )
}
