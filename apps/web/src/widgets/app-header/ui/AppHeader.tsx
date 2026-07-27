import { Link, useLocation } from 'react-router-dom'
import { SearchBar } from '@/features/search'
import { ThemeToggle } from '@/features/theme'
import { AuthControls } from '@/features/auth'
import styles from './AppHeader.module.css'

export function AppHeader() {
  const { pathname } = useLocation()
  // Search belongs only on list-backed pages (album feed, search, artist's
  // albums, favorites). Hide on single-item detail (/albums/:id), admin (its
  // own search), the auth callback, and the my-page.
  const showSearch = !/^\/(albums\/[^/]+$|admin|auth\/|me(\/|$))/.test(pathname)

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand} aria-label="힙집 홈">
        <img src="/logo.png" alt="힙집" className={styles.logo} />
      </Link>
      {showSearch && <SearchBar />}
      {/* margin-left:auto — pinned right whether or not the search bar is there. */}
      <div className={styles.controls}>
        <ThemeToggle />
        <AuthControls />
      </div>
    </header>
  )
}
