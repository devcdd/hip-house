import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAlbum } from '@/entities/album'
import { useAuth } from '@/entities/session'
import { FavoriteButton, useFavoriteIds } from '@/features/favorite-album'
import { startKakaoLogin } from '@/features/auth'
import { apiDelete, apiPost } from '@/shared/api/client'
import styles from './AlbumDetailPage.module.css'

export function AlbumDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: album, isLoading: loading, error } = useAlbum(id)
  const { isAuthed, isAdmin } = useAuth()
  const favIds = useFavoriteIds(isAuthed)

  // Admin soft-delete / restore.
  const toggleDelete = useMutation({
    mutationFn: (deleted: boolean) =>
      deleted ? apiPost(`/albums/${encodeURIComponent(id)}/restore`) : apiDelete(`/albums/${encodeURIComponent(id)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['album', id] })
      qc.invalidateQueries({ queryKey: ['albums'] })
    },
  })

  return (
    <div className={styles.page}>
      {/* Back to the exact previous URL so list filters (in the query string) survive. */}
      <button type="button" onClick={() => navigate(-1)} className={styles.back}>
        ← 목록
      </button>

      {loading && <p className={styles.state}>불러오는 중…</p>}
      {error && <p className={styles.state}>불러오기 실패: {String(error)}</p>}

      {album && (
        <div className={styles.content}>
          <div className={styles.art}>
            {album.image_url ? (
              <img src={album.image_url} alt={album.name} />
            ) : (
              <div className={styles.placeholder}>{album.name.slice(0, 1)}</div>
            )}
          </div>

          <div className={styles.info}>
            <h1 className={styles.name}>
              {album.name}
              {album.deleted_at && <span className={styles.deletedBadge}>삭제됨</span>}
            </h1>
            <p className={styles.artist}>{album.artist_name}</p>

            <dl className={styles.facts}>
              {album.year != null && <Fact label="발매 연도" value={album.year} />}
              {album.release_date && <Fact label="발매일" value={album.release_date} />}
              {album.type_label && <Fact label="유형" value={album.type_label} />}
              {album.total_tracks != null && <Fact label="트랙 수" value={`${album.total_tracks}곡`} />}
            </dl>

            <div className={styles.actions}>
              {isAuthed ? (
                <FavoriteButton albumId={album.id} favorited={favIds.has(album.id)} variant="inline" />
              ) : (
                <button type="button" className={styles.loginHint} onClick={startKakaoLogin}>
                  로그인하고 즐겨찾기
                </button>
              )}
              {album.spotify_url && (
                <a className={styles.spotify} href={album.spotify_url} target="_blank" rel="noreferrer">
                  Spotify에서 열기 ↗
                </a>
              )}
              {isAdmin && (
                <button
                  type="button"
                  className={album.deleted_at ? styles.restore : styles.delete}
                  disabled={toggleDelete.isPending}
                  onClick={() => toggleDelete.mutate(!!album.deleted_at)}
                >
                  {album.deleted_at ? '복구' : '삭제'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {album && (
        <section className={styles.tracks}>
          <h2 className={styles.tracksTitle}>트랙리스트</h2>
          {/* Tracklist data isn't in our DB — embed Spotify's player for the real, playable list. */}
          <iframe
            title="Spotify tracklist"
            className={styles.embed}
            src={`https://open.spotify.com/embed/album/${encodeURIComponent(album.id)}?theme=0`}
            loading="lazy"
            allow="encrypted-media"
          />
        </section>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
