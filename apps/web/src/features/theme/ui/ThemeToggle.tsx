import { useTheme } from '../model/useTheme'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={toggle}
      aria-label={resolved === 'dark' ? '라이트 모드로' : '다크 모드로'}
      title={resolved === 'dark' ? '라이트 모드로' : '다크 모드로'}
    >
      {resolved === 'dark' ? '☀' : '☾'}
    </button>
  )
}
