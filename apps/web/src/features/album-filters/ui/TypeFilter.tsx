import { TYPE_OPTIONS, type AlbumType } from '../model/types'
import styles from './TypeFilter.module.css'

interface Props {
  value: AlbumType[]
  onChange: (types: AlbumType[]) => void
}

// Multi-select: 전체(선택 없음) + 싱글/EP/정규 토글.
export function TypeFilter({ value, onChange }: Props) {
  const toggle = (k: AlbumType) =>
    onChange(value.includes(k) ? value.filter((v) => v !== k) : [...value, k])

  return (
    <div className={styles.tabs} role="group" aria-label="앨범 유형">
      <button
        type="button"
        aria-pressed={value.length === 0}
        className={value.length === 0 ? `${styles.tab} ${styles.active}` : styles.tab}
        onClick={() => onChange([])}
      >
        전체
      </button>
      {TYPE_OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value.includes(o.key)}
          className={value.includes(o.key) ? `${styles.tab} ${styles.active}` : styles.tab}
          onClick={() => toggle(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
