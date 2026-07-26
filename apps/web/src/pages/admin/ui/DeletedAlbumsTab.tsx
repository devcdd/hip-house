import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { AlbumCard, AlbumCardSkeleton, useAlbumFeed } from '@/entities/album'
import { apiPost } from '@/shared/api/client'
import { useInfiniteScroll } from '@/shared/lib/useInfiniteScroll'
import styles from './AdminPage.module.css'

// Soft-deleted albums (server returns them only to admins) with one-click 복구.
export function DeletedAlbumsTab() {
  const qc = useQueryClient()
  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, isFetchingNextPage, error } =
    useAlbumFeed({ deletedOnly: true })
  const albums = useMemo(() => data?.pages.flat() ?? [], [data])
  const sentinel = useInfiniteScroll<HTMLDivElement>(fetchNextPage, hasNextPage && !isFetching)

  const restore = useMutation({
    mutationFn: (id: string) => apiPost(`/albums/${encodeURIComponent(id)}/restore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['albums'] }),
  })

  return (
    <div>
      {error && <p className={styles.state}>불러오기 실패: {String(error)}</p>}
      <div className={styles.grid}>
        {albums.map((a) => (
          <div key={a.id} className={styles.item}>
            <button
              type="button"
              className={styles.restore}
              disabled={restore.isPending}
              onClick={() => restore.mutate(a.id)}
            >
              <RotateCcw size={13} />
              복구
            </button>
            <AlbumCard album={a} />
          </div>
        ))}
        {isLoading &&
          Array.from({ length: 8 }, (_, i) => (
            <div key={`skeleton-${i}`} className={styles.item}>
              <AlbumCardSkeleton />
            </div>
          ))}
      </div>
      {hasNextPage && <div ref={sentinel} className={styles.sentinel} />}
      {isFetchingNextPage && <p className={styles.state}>불러오는 중…</p>}
      {!isLoading && !error && albums.length === 0 && <p className={styles.state}>삭제된 앨범이 없습니다.</p>}
    </div>
  )
}
