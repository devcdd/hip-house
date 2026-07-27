import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Search, X } from 'lucide-react'
import { Avatar } from '@/shared/ui/Avatar'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { crawlArtist, fetchSpotifyKeys, searchSpotifyArtists } from '../api/spotifyAdminApi'
import styles from './AdminPage.module.css'

const nf = new Intl.NumberFormat('ko-KR')

// 웹에서 바로 크롤링: Spotify 아티스트 검색 → 선택하면 그 아티스트의 전체
// 앨범을 서버가 수집해 저장한다 (artist.sh의 웹 버전).
export function CrawlTab() {
  const qc = useQueryClient()
  // Configured credential pairs on the server (first/second/third/... env pairs).
  const keysQuery = useQuery({ queryKey: ['spotify-keys'], queryFn: fetchSpotifyKeys, staleTime: Infinity })
  const keys = keysQuery.data ?? []
  const [picked, setPicked] = useState('')
  const key = picked && keys.includes(picked) ? picked : (keys[0] ?? '') // '' = server default pair

  const [input, setInput] = useState('')
  const q = useDebouncedValue(input.trim(), 350)
  const [message, setMessage] = useState('')

  const search = useQuery({
    queryKey: ['spotify-search', q, key],
    queryFn: () => searchSpotifyArtists(q, key),
    enabled: q.length > 0,
    staleTime: 60_000,
  })

  const crawl = useMutation({
    mutationFn: (artistId: string) => crawlArtist(artistId, key),
    onSuccess: (res) => {
      setMessage(
        res.saved
          ? `✅ ${res.artist_name ?? '아티스트'}: 앨범 ${res.albums}개 저장 (크레딧 아티스트 ${res.artists ?? 0}명, 이미지 ${res.enriched ?? 0}개 채움)`
          : '앨범이 0개라 저장하지 않았습니다.',
      )
      qc.invalidateQueries({ queryKey: ['artists'] })
      qc.invalidateQueries({ queryKey: ['albums'] })
      qc.invalidateQueries({ queryKey: ['spotify-search'] })
    },
    onError: (e) => setMessage(`실패: ${String(e)}`),
  })

  return (
    <div className={styles.aliasWrap}>
      <div className={styles.crawlControls}>
        {keys.length > 0 && (
          <div className={styles.keyToggle} role="radiogroup" aria-label="Spotify API 키 선택">
            {keys.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={key === k}
                className={key === k ? `${styles.tab} ${styles.active}` : styles.tab}
                onClick={() => setPicked(k)}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <div className={styles.searchForm}>
          <Search size={15} className={styles.searchIcon} aria-hidden />
          <input
            className={styles.searchInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Spotify에서 아티스트 검색"
            aria-label="Spotify 아티스트 검색"
          />
          {input && (
            <button type="button" className={styles.clearBtn} onClick={() => setInput('')} aria-label="검색어 지우기">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {message && <p className={styles.crawlMsg}>{message}</p>}
      {search.error && <p className={styles.state}>검색 실패: {String(search.error)}</p>}
      {search.isFetching && <p className={styles.state}>검색 중…</p>}

      <div className={styles.rows}>
        {(search.data ?? []).map((hit) => (
          <div key={hit.id} className={styles.row}>
            <Avatar src={hit.image_url} name={hit.name} size={40} />
            <div className={styles.rowInfo}>
              <span className={styles.rowName} title={hit.name}>
                {hit.name}
              </span>
              <span className={styles.rowId}>팔로워 {nf.format(hit.followers)}</span>
            </div>
            <span className={hit.albums_in_db > 0 ? `${styles.dbBadge} ${styles.dbBadgeHas}` : styles.dbBadge}>
              {hit.albums_in_db > 0 ? `DB ${hit.albums_in_db}개` : '미등록'}
            </span>
            <button
              type="button"
              className={styles.crawlBtn}
              disabled={crawl.isPending}
              onClick={() => {
                setMessage('')
                crawl.mutate(hit.id)
              }}
            >
              <Download size={14} />
              {crawl.isPending && crawl.variables === hit.id ? '수집 중…' : '앨범 가져오기'}
            </button>
          </div>
        ))}
      </div>
      {q && !search.isFetching && !search.error && (search.data?.length ?? 0) === 0 && (
        <p className={styles.state}>검색 결과가 없습니다.</p>
      )}
      {!q && <p className={styles.state}>아티스트 이름으로 Spotify를 검색하세요.</p>}
    </div>
  )
}
