import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/entities/session'
import { DeletedAlbumsTab } from './DeletedAlbumsTab'
import { AliasManagerTab } from './AliasManagerTab'
import styles from './AdminPage.module.css'

type Tab = 'deleted' | 'aliases'
const TABS: { key: Tab; label: string }[] = [
  { key: 'deleted', label: '삭제된 앨범' },
  { key: 'aliases', label: '연관검색어' },
]

export function AdminPage() {
  const { isAdmin, isLoading } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'aliases' ? 'aliases' : 'deleted'

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

      {tab === 'deleted' ? <DeletedAlbumsTab /> : <AliasManagerTab />}
    </div>
  )
}
