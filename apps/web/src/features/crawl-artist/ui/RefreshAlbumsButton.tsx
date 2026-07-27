import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useAuth } from '@/entities/session'
import { fetchSpotifyKeys } from '@/features/crawl-artist/api/crawlApi'
import { useCrawlArtist } from '@/features/crawl-artist/model/useCrawlArtist'
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
        <select
          className={styles.key}
          value={key}
          aria-label="Spotify API 키 선택"
          onChange={(e) => setPicked(e.target.value)}
        >
          {keys.map((k) => (
            <option key={k} value={k}>
              {k.toUpperCase()}
            </option>
          ))}
        </select>
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
