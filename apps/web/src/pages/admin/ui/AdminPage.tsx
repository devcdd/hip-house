import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/entities/session'
import { DeletedAlbumsTab } from './DeletedAlbumsTab'
import { AliasManagerTab } from './AliasManagerTab'
import { CrawlTab } from './CrawlTab'
import { TracksTab } from './TracksTab'
import { StatsTab } from './StatsTab'
import { ReportsTab } from './ReportsTab'
import styles from './AdminPage.module.css'

type Tab = 'deleted' | 'aliases' | 'crawl' | 'tracks' | 'stats' | 'reports'
const TABS: { key: Tab; label: string }[] = [
  { key: 'crawl', label: '크롤링' },
  { key: 'tracks', label: '트랙 동기화' },
  { key: 'aliases', label: '연관검색어' },
  { key: 'deleted', label: '삭제된 앨범' },
  { key: 'reports', label: '힙합 아님 신고' },
  { key: 'stats', label: '통계' },
]

export function AdminPage() {
  const { isAdmin, isLoading } = useAuth()
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab =
    raw === 'aliases' || raw === 'deleted' || raw === 'stats' || raw === 'reports' || raw === 'tracks' ? raw : 'crawl'

  if (isLoading) return <p className={styles.state}>확인 중…</p>
  if (!isAdmin) return <p className={styles.state}>관리자 전용 페이지입니다.</p>

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>관리자</h1>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab}
            className={t.key === tab ? `${styles.tab} ${styles.active}` : styles.tab}
            onClick={() => setParams({ tab: t.key }, { replace: true })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'crawl' ? (
        <CrawlTab />
      ) : tab === 'tracks' ? (
        <TracksTab />
      ) : tab === 'deleted' ? (
        <DeletedAlbumsTab />
      ) : tab === 'stats' ? (
        <StatsTab />
      ) : tab === 'reports' ? (
        <ReportsTab />
      ) : (
        <AliasManagerTab />
      )}
    </div>
  )
}
