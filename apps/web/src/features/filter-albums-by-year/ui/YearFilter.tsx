import type { YearOption } from '../model/types'
import styles from './YearFilter.module.css'

interface Props {
  years: YearOption[]
  value: YearOption
  onChange: (year: YearOption) => void
}

export function YearFilter({ years, value, onChange }: Props) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="연도 필터">
      {years.map((y) => (
        <button
          key={y}
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
