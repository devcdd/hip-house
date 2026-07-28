import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KeyRound, RefreshCw } from 'lucide-react'
import { useAuth } from '@/entities/session'
import { fetchSpotifyKeys } from '@/features/crawl-artist/api/crawlApi'
import { useCrawlArtist } from '@/features/crawl-artist/model/useCrawlArtist'
import { PopoverSelect } from '@/shared/ui/PopoverSelect'
import styles from './RefreshAlbumsButton.module.css'

// Admin-only shortcut: same crawl as the admin 크롤링 탭, but right where the
// missing albums are noticed. Renders nothing for everyone else.
export function RefreshAlbumsButton({ artistId }: { artistId: string }) {
  const { isAdmin } = useAuth()
  const crawl = useCrawlArtist()
  // Same credential pairs the admin tab offers. Only fetched for admins.
  const { data: keys = [] } = useQuery({
    queryKey: ['spotify-keys'],
    queryFn: fetchSpotifyKeys,
    enabled: isAdmin,
    staleTime: Infinity,
  })
  const [picked, setPicked] = useState('')
  const key = picked && keys.includes(picked) ? picked : (keys[0] ?? '') // '' = server default pair

  if (!isAdmin) return null

  return (
    <div className={styles.wrap}>
      {keys.length > 1 && (
        // 정렬 필터와 같은 팝오버 셀렉트 — 브라우저 기본 드롭다운과 섞이지 않게.
        <PopoverSelect
          value={key}
          onChange={setPicked}
          ariaLabel="Spotify API 키"
          options={keys.map((k) => ({ key: k, label: k.toUpperCase(), icon: KeyRound }))}
        />
      )}
      <button
        type="button"
        className={styles.btn}
        disabled={crawl.isPending}
        onClick={() => crawl.mutate({ artistId, key })}
      >
        <RefreshCw size={14} strokeWidth={2.2} className={crawl.isPending ? styles.spin : undefined} />
        {crawl.isPending ? '갱신 중…' : '앨범 목록 갱신'}
      </button>
    </div>
  )
}
