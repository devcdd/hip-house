import { Link } from 'react-router-dom'
import { Heart, Settings } from 'lucide-react'
import { useAuth } from '@/entities/session'
import { startKakaoLogin } from '@/features/auth/lib/kakao'
import styles from './AuthControls.module.css'

export function AuthControls() {
  const { isAuthed, isAdmin, user, signOut } = useAuth()

  if (!isAuthed) {
    return (
      <button type="button" className={styles.login} onClick={startKakaoLogin}>
        카카오 로그인
      </button>
    )
  }

  return (
    <div className={styles.wrap}>
      {isAdmin && (
        <Link to="/admin" className={styles.link} title="관리자" aria-label="관리자">
          <Settings size={17} />
        </Link>
      )}
      <Link to="/favorites" className={styles.link} title="즐겨찾기" aria-label="즐겨찾기">
        <Heart size={17} />
      </Link>
      <span className={styles.name} title={user?.nickname}>
        {user?.nickname || '사용자'}
      </span>
      <button type="button" className={styles.logout} onClick={signOut}>
        로그아웃
      </button>
    </div>
  )
}
