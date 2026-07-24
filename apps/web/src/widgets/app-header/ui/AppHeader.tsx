import { Link } from 'react-router-dom'
import { SearchBar } from '@/features/search'
import { ThemeToggle } from '@/features/theme'
import { AuthControls } from '@/features/auth'
import styles from './AppHeader.module.css'

export function AppHeader() {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand} aria-label="힙집 홈">
        <img src="/logo.png" alt="힙집" className={styles.logo} />
      </Link>
      <SearchBar />
      <ThemeToggle />
      <AuthControls />
    </header>
  )
}
