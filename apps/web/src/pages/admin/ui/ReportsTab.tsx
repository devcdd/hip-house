import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Flag, RotateCcw, Trash2 } from 'lucide-react'
import { AlbumCard } from '@/entities/album'
import { clearFlags, fetchFlaggedAlbums } from '@/features/report-album'
import { apiDelete, apiPost } from '@/shared/api/client'
import { useToast } from '@/shared/ui/toast'
import styles from './AdminPage.module.css'

// 사용자가 "힙합이 아니에요"로 신고한 앨범 — 신고 많은 순. 여기서 바로
// 삭제(소프트)하거나, 확인 결과 문제없으면 신고를 지운다.
export function ReportsTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const {
    data: albums,
    isLoading,
    error,
  } = useQuery({ queryKey: ['admin-flags', 'not-hiphop'], queryFn: () => fetchFlaggedAlbums('not-hiphop') })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-flags', 'not-hiphop'] })
    qc.invalidateQueries({ queryKey: ['albums'] })
  }

  const toggleDelete = useMutation({
    mutationFn: ({ id, deleted }: { id: string; deleted: boolean }) =>
      deleted ? apiPost(`/albums/${encodeURIComponent(id)}/restore`) : apiDelete(`/albums/${encodeURIComponent(id)}`),
    onSuccess: (_data, { deleted }) => {
      refresh()
      toast(deleted ? '앨범을 복구했습니다' : '앨범을 삭제했습니다')
    },
    onError: () => toast('처리에 실패했습니다', 'error'),
  })

  const dismiss = useMutation({
    mutationFn: (id: string) => clearFlags('not-hiphop', id),
    onSuccess: () => {
      refresh()
      toast('신고를 정리했습니다')
    },
    onError: () => toast('처리에 실패했습니다', 'error'),
  })

  if (isLoading) return <p className={styles.state}>불러오는 중…</p>
  if (error) return <p className={styles.state}>불러오기 실패: {String(error)}</p>
  if ((albums?.length ?? 0) === 0) return <p className={styles.state}>신고된 앨범이 없습니다.</p>

  return (
    <div className={styles.grid}>
      {albums?.map((a) => (
        <div key={a.id} className={a.deleted_at ? `${styles.item} ${styles.dimmed}` : styles.item}>
          <span className={styles.reportCount} title={`${a.report_count}명이 신고`}>
            <Flag size={12} strokeWidth={2.4} fill="currentColor" />
            {a.report_count}
          </span>
          <AlbumCard album={a} />
          <div className={styles.reportActions}>
            <button
              type="button"
              className={styles.reportDelete}
              disabled={toggleDelete.isPending}
              onClick={() => toggleDelete.mutate({ id: a.id, deleted: !!a.deleted_at })}
            >
              {a.deleted_at ? <RotateCcw size={13} strokeWidth={2.4} /> : <Trash2 size={13} strokeWidth={2.4} />}
              {a.deleted_at ? '복구' : '삭제'}
            </button>
            <button
              type="button"
              className={styles.reportDismiss}
              disabled={dismiss.isPending}
              onClick={() => dismiss.mutate(a.id)}
            >
              <Check size={13} strokeWidth={2.4} />
              문제없음
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
