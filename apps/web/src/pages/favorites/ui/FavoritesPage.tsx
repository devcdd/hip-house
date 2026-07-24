import { AlbumCard } from '@/entities/album'
import { useAuth } from '@/entities/session'
import { FavoriteButton, useFavoriteAlbums } from '@/features/favorite-album'
import { startKakaoLogin } from '@/features/auth'
import styles from './FavoritesPage.module.css'

export function FavoritesPage() {
  const { isAuthed } = useAuth()
  const { data: albums, isLoading } = useFavoriteAlbums(isAuthed)

  if (!isAuthed) {
    return (
      <div className={styles.page}>
        <p className={styles.state}>즐겨찾기는 로그인 후 이용할 수 있습니다.</p>
        <button type="button" className={styles.login} onClick={startKakaoLogin}>
          카카오 로그인
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>즐겨찾기</h1>
      {isLoading && <p className={styles.state}>불러오는 중…</p>}
      {!isLoading && (albums?.length ?? 0) === 0 && <p className={styles.state}>아직 즐겨찾기한 앨범이 없습니다.</p>}
      <div className={styles.grid}>
        {albums?.map((a) => (
          <div key={a.id} className={styles.item}>
            <FavoriteButton albumId={a.id} favorited />
            <AlbumCard album={a} />
          </div>
        ))}
      </div>
    </div>
  )
}
