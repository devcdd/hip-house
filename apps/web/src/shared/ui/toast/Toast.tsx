import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import styles from './Toast.module.css'

type Kind = 'success' | 'error' | 'info'

interface Item {
  id: number
  kind: Kind
  message: string
}

const ICONS = { success: CircleCheck, error: TriangleAlert, info: Info }
const DURATION = 2600

// Default no-op so a component rendered outside the provider (tests, storybook)
// doesn't explode — it just loses the toast.
const ToastContext = createContext<(message: string, kind?: Kind) => void>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const nextId = useRef(0)

  const show = useCallback((message: string, kind: Kind = 'success') => {
    const id = nextId.current++
    setItems((prev) => [...prev, { id, kind, message }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), DURATION)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {items.map((t) => {
          const Icon = ICONS[t.kind]
          return (
            <div
              key={t.id}
              className={`${styles.toast} ${styles[t.kind]}`}
              style={{ animationDuration: `${DURATION}ms` }}
            >
              <Icon size={17} strokeWidth={2.4} className={styles.icon} />
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
