import { useMemo } from 'react'
import { ArtistCard, useArtistSearch } from '@/entities/artist'
import { useInfiniteScroll } from '@/shared/lib/useInfiniteScroll'
import styles from './ArtistGrid.module.css'

export function ArtistGrid({ q }: { q: string }) {
  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, isFetchingNextPage, error } =
    useArtistSearch(q)
  const artists = useMemo(() => data?.pages.flat() ?? [], [data])
  const sentinel = useInfiniteScroll<HTMLDivElement>(fetchNextPage, hasNextPage && !isFetching)

  return (
    <div>
      {error && <p className={styles.state}>불러오기 실패: {String(error)}</p>}
      <div className={styles.grid}>
        {artists.map((a) => (
          <ArtistCard key={a.id} artist={a} />
        ))}
      </div>
      {hasNextPage && <div ref={sentinel} className={styles.sentinel} />}
      {(isLoading || isFetchingNextPage) && <p className={styles.state}>불러오는 중…</p>}
      {!isLoading && !error && artists.length === 0 && <p className={styles.state}>아티스트가 없습니다.</p>}
    </div>
  )
}
