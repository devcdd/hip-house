import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react'
import styles from './PopoverSelect.module.css'

export interface PopoverOption<T extends string> {
  key: T
  label: string
  hint?: string // 옵션 아래 한 줄 설명 (선택)
  icon?: LucideIcon
  disabled?: boolean
}

interface Props<T extends string> {
  value: T
  options: PopoverOption<T>[]
  onChange: (key: T) => void
  ariaLabel: string // "정렬", "Spotify API 키" 등 — 트리거/메뉴 라벨에 함께 쓰임
}

// 네이티브 <select> 대신 쓰는 팝오버 셀렉트: 옵션마다 아이콘과 설명 한 줄을 달 수
// 있고, 브라우저마다 제각각인 기본 드롭다운 대신 앱 전체가 같은 모양을 갖는다.
export function PopoverSelect<T extends string>({ value, options, onChange, ariaLabel }: Props<T>) {
  const [open, setOpen] = useState(false)
  const [alignLeft, setAlignLeft] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.key === value) ?? options[0]
  const CurrentIcon = current?.icon

  // The trigger can sit anywhere in a wrapping row. Anchor the menu toward the
  // viewport center so it never spills off either edge. useLayoutEffect flips it
  // before paint (no flash).
  useLayoutEffect(() => {
    if (!open || !root.current) return
    const r = root.current.getBoundingClientRect()
    setAlignLeft(r.left < window.innerWidth / 2)
  }, [open])

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

  if (!current) return null

  return (
    <div className={styles.root} ref={root}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
      >
        {CurrentIcon && <CurrentIcon size={15} strokeWidth={2.2} className={styles.triggerIcon} />}
        {current.label}
        <ChevronDown size={15} strokeWidth={2.4} className={open ? styles.chevronOpen : styles.chevron} />
      </button>

      {open && (
        <ul className={alignLeft ? `${styles.menu} ${styles.menuLeft}` : styles.menu} role="listbox" aria-label={ariaLabel}>
          {options.map((o) => {
            const Icon = o.icon
            const selected = o.key === value
            return (
              <li key={o.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={o.disabled}
                  className={selected ? `${styles.option} ${styles.selected}` : styles.option}
                  onClick={() => {
                    onChange(o.key)
                    setOpen(false)
                  }}
                >
                  {Icon && <Icon size={16} strokeWidth={2.1} className={styles.optionIcon} />}
                  <span className={styles.text}>
                    <span className={styles.label}>{o.label}</span>
                    {o.hint && <span className={styles.hint}>{o.hint}</span>}
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
