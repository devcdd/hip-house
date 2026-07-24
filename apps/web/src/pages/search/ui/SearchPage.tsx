import { useSearchParams } from 'react-router-dom'
import { AlbumFeed } from '@/widgets/album-feed'
import { ArtistGrid } from '@/widgets/artist-grid'
import styles from './SearchPage.module.css'

type Tab = 'album' | 'artist'
const TABS: { key: Tab; label: string }[] = [
  { key: 'album', label: '앨범' },
  { key: 'artist', label: '아티스트' },
]

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const tab: Tab = params.get('type') === 'artist' ? 'artist' : 'album'

  const setTab = (t: Tab) => setParams({ q, type: t }, { replace: true })

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        “{q}” 검색 결과
      </h1>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab}
            className={t.key === tab ? `${styles.tab} ${styles.active}` : styles.tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {q === '' ? (
        <p className={styles.state}>검색어를 입력하세요.</p>
      ) : tab === 'album' ? (
        <AlbumFeed params={{ q }} />
      ) : (
        <ArtistGrid q={q} />
      )}
    </div>
  )
}
