import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Languages } from 'lucide-react'
import { AlbumCard, updateAlbumDisplayName } from '@/entities/album'
import { clearFlags, fetchFlaggedAlbums, type FlaggedAlbum } from '@/features/report-album'
import { useToast } from '@/shared/ui/toast'
import styles from './AdminPage.module.css'

// 사용자가 "앨범명 좀 바꿔주세요"로 요청한 앨범 — 요청 많은 순. 목록에서 바로
// 한글명을 입력해 저장한다 (저장하면 그 앨범의 요청은 처리된 것으로 보고 정리).
export function RenameRequestsTab() {
  const {
    data: albums,
    isLoading,
    error,
  } = useQuery({ queryKey: ['admin-flags', 'rename'], queryFn: () => fetchFlaggedAlbums('rename') })

  if (isLoading) return <p className={styles.state}>불러오는 중…</p>
  if (error) return <p className={styles.state}>불러오기 실패: {String(error)}</p>
  if ((albums?.length ?? 0) === 0) return <p className={styles.state}>이름 변경 요청이 없습니다.</p>

  return (
    <div className={styles.grid}>
      {albums?.map((a) => (
        <RenameRow key={a.id} album={a} />
      ))}
    </div>
  )
}

function RenameRow({ album }: { album: FlaggedAlbum }) {
  const qc = useQueryClient()
  const toast = useToast()
  const saved = album.display_name ?? ''
  const [text, setText] = useState(saved)

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-flags', 'rename'] })
    qc.invalidateQueries({ queryKey: ['albums'] })
    qc.invalidateQueries({ queryKey: ['album', album.id] })
  }

  const save = useMutation({
    mutationFn: async () => {
      await updateAlbumDisplayName(album.id, text.trim())
      // 이름을 넣었으면 요청은 처리 완료 — 목록에서 자연히 빠진다.
      if (text.trim()) await clearFlags('rename', album.id)
    },
    onSuccess: () => {
      refresh()
      toast(text.trim() ? '한글 이름을 저장했습니다' : '한글 이름을 해제했습니다')
    },
    onError: () => toast('저장에 실패했습니다', 'error'),
  })

  const dismiss = useMutation({
    mutationFn: () => clearFlags('rename', album.id),
    onSuccess: () => {
      refresh()
      toast('요청을 정리했습니다')
    },
    onError: () => toast('처리에 실패했습니다', 'error'),
  })

  return (
    <div className={album.deleted_at ? `${styles.item} ${styles.dimmed}` : styles.item}>
      <span className={styles.reportCount} title={`${album.report_count}명이 요청`}>
        <Languages size={12} strokeWidth={2.4} />
        {album.report_count}
      </span>
      <AlbumCard album={album} />
      <form
        className={styles.renameForm}
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <input
          className={`${styles.aliasInput} ${styles.renameInput}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={album.name}
          title="비우고 저장하면 원본 이름으로 돌아갑니다"
          aria-label="한글 표시 이름"
        />
        <button type="submit" className={styles.save} disabled={save.isPending || text.trim() === saved}>
          {save.isPending ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          className={styles.reportDismiss}
          disabled={dismiss.isPending}
          onClick={() => dismiss.mutate()}
        >
          <Check size={13} strokeWidth={2.4} />
          그대로 두기
        </button>
      </form>
    </div>
  )
}
