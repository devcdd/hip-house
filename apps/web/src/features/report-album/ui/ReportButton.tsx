import { Flag } from 'lucide-react'
import { useAuth } from '@/entities/session'
import { startKakaoLogin } from '@/features/auth'
import { useMyReports, useToggleReport } from '@/features/report-album/model/useReports'
import styles from './ReportButton.module.css'

// 크롤러가 아티스트 디스코그래피를 통째로 가져오다 보니 OST 같은 게 섞인다.
// 사용자가 눌러 쌓아두면 관리자가 모아 보고 정리한다.
export function ReportButton({ albumId }: { albumId: string }) {
  const { isAuthed } = useAuth()
  const reports = useMyReports(isAuthed)
  const toggle = useToggleReport()

  if (!isAuthed) {
    return (
      <button type="button" className={styles.btn} onClick={startKakaoLogin}>
        <Flag size={14} strokeWidth={2.2} />
        힙합이 아니에요
      </button>
    )
  }

  const reported = reports.has(albumId)
  return (
    <button
      type="button"
      className={reported ? `${styles.btn} ${styles.on}` : styles.btn}
      aria-pressed={reported}
      disabled={toggle.isPending}
      onClick={() => toggle.mutate({ id: albumId, reported })}
    >
      <Flag size={14} strokeWidth={2.2} fill={reported ? 'currentColor' : 'none'} />
      {reported ? '신고함' : '힙합이 아니에요'}
    </button>
  )
}
