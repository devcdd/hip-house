import { SORT_OPTIONS, type SortKey } from '../model/types'
import styles from './SortSelect.module.css'

interface Props {
  value: SortKey
  onChange: (s: SortKey) => void
  disabledKeys?: SortKey[]
}

export function SortSelect({ value, onChange, disabledKeys = [] }: Props) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={(e) => onChange(e.target.value as SortKey)}
      aria-label="정렬"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.key} value={o.key} disabled={o.disabled || disabledKeys.includes(o.key)}>
          {o.label}
          {o.disabled ? ' (준비중)' : ''}
        </option>
      ))}
    </select>
  )
}
