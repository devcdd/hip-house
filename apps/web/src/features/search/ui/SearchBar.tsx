import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import styles from './SearchBar.module.css'

export function SearchBar() {
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const navigate = useNavigate()
  const location = useLocation()
  const onSearchPage = location.pathname === '/search'
  const debounced = useDebouncedValue(q, 300)

  // Live search: typing lands on /search (one history entry), then further
  // keystrokes replace in place so Back still returns to where you were.
  useEffect(() => {
    const term = debounced.trim()
    if (term === (params.get('q') ?? '').trim()) return
    if (term) {
      const p = new URLSearchParams(onSearchPage ? params : undefined)
      p.set('q', term)
      navigate(`/search?${p.toString()}`, { replace: onSearchPage })
    } else if (onSearchPage) {
      navigate('/', { replace: true }) // cleared → back to the default album list
    }
  }, [debounced]) // params/location are read fresh on each debounce tick

  function submit(e: FormEvent) {
    e.preventDefault()
    const term = q.trim()
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`, { replace: onSearchPage })
  }

  return (
    <form onSubmit={submit} className={styles.form} role="search">
      <Search size={15} className={styles.icon} aria-hidden />
      <input
        className={styles.input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="앨범·아티스트 검색"
        aria-label="검색"
      />
      {q && (
        <button type="button" className={styles.clear} onClick={() => setQ('')} aria-label="검색어 지우기">
          <X size={14} />
        </button>
      )}
    </form>
  )
}
