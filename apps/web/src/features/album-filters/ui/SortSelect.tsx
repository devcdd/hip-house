import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Clock, Flame, ListMusic, Star } from 'lucide-react'
import { SORT_OPTIONS, type SortKey } from '../model/types'
import styles from './SortSelect.module.css'

interface Props {
  value: SortKey
  onChange: (s: SortKey) => void
  disabledKeys?: SortKey[]
}

const ICONS: Record<SortKey, typeof Clock> = {
  recent: Clock,
  popular: Flame,
  rating: Star,
  tracks: ListMusic,
}

// Custom popover instead of <select> so each option can carry an icon + hint —
// "인기순" vs "별점 높은 순" needs the one-line explanation to be distinguishable.
export function SortSelect({ value, onChange, disabledKeys = [] }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const current = SORT_OPTIONS.find((o) => o.key === value) ?? SORT_OPTIONS[0]
  const CurrentIcon = ICONS[current.key]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.root} ref={root}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`정렬: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
      >
        <CurrentIcon size={15} strokeWidth={2.2} className={styles.triggerIcon} />
        {current.label}
        <ChevronDown size={15} strokeWidth={2.4} className={open ? styles.chevronOpen : styles.chevron} />
      </button>

      {open && (
        <ul className={styles.menu} role="listbox" aria-label="정렬">
          {SORT_OPTIONS.map((o) => {
            const Icon = ICONS[o.key]
            const selected = o.key === value
            return (
              <li key={o.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={disabledKeys.includes(o.key)}
                  className={selected ? `${styles.option} ${styles.selected}` : styles.option}
                  onClick={() => {
                    onChange(o.key)
                    setOpen(false)
                  }}
                >
                  <Icon size={16} strokeWidth={2.1} className={styles.optionIcon} />
                  <span className={styles.text}>
                    <span className={styles.label}>{o.label}</span>
                    <span className={styles.hint}>{o.hint}</span>
                  </span>
                  {selected && <Check size={15} strokeWidth={2.6} className={styles.check} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
