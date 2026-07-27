import { Fragment } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react'
import { useAlbum } from '@/entities/album'
import { useAuth } from '@/entities/session'
import { FavoriteButton, useFavoriteIds } from '@/features/favorite-album'
import { RatingControl, StarRating, useRatingMap } from '@/features/rate-album'
import { CommentSection } from '@/features/album-comments'
import { ReportButton } from '@/features/report-album'
import { startKakaoLogin } from '@/features/auth'
import { apiDelete, apiPost } from '@/shared/api/client'
import { AlbumDetailSkeleton } from './AlbumDetailSkeleton'
import styles from './AlbumDetailPage.module.css'

export function AlbumDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: album, isLoading: loading, error } = useAlbum(id)
  const { isAuthed, isAdmin } = useAuth()
  const favIds = useFavoriteIds(isAuthed)
  const ratings = useRatingMap(isAuthed)

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
        <ArrowLeft size={16} strokeWidth={2.4} />
        목록
      </button>

      {loading && <AlbumDetailSkeleton />}
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
            <p className={styles.artist}>
              {album.artists.map((a, i) => (
                <Fragment key={a.id}>
                  {i > 0 && ', '}
                  <Link to={`/artists/${encodeURIComponent(a.id)}`}>{a.name ?? a.id}</Link>
                </Fragment>
              ))}
            </p>

            <dl className={styles.facts}>
              {album.year != null && <Fact label="발매 연도" value={album.year} />}
              {album.release_date && <Fact label="발매일" value={album.release_date} />}
              {album.type_label && <Fact label="유형" value={album.type_label} />}
              {album.total_tracks != null && <Fact label="트랙 수" value={`${album.total_tracks}곡`} />}
            </dl>

            {/* Everyone sees the album's average; only members can add their own. */}
            <div className={styles.rating}>
              {album.rating_count > 0 && album.rating_avg != null ? (
                <div className={styles.average}>
                  <span className={styles.avgScore}>{album.rating_avg.toFixed(1)}</span>
                  {/* rating_avg is in stars; StarRating counts half-stars. */}
                  <StarRating score={Math.round(album.rating_avg * 2)} size={16} />
                  <span className={styles.avgCount}>{album.rating_count}명 평가</span>
                </div>
              ) : (
                <p className={styles.average}>아직 평가가 없습니다</p>
              )}
            </div>

            <div className={styles.actions}>
              {isAuthed && <RatingControl albumId={album.id} score={ratings.get(album.id) ?? 0} />}
              {isAuthed ? (
                <FavoriteButton albumId={album.id} favorited={favIds.has(album.id)} variant="inline" />
              ) : (
                <button type="button" className={styles.loginHint} onClick={startKakaoLogin}>
                  로그인하고 즐겨찾기
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  className={album.deleted_at ? styles.restore : styles.delete}
                  disabled={toggleDelete.isPending}
                  onClick={() => toggleDelete.mutate(!!album.deleted_at)}
                >
                  {album.deleted_at ? <RotateCcw size={15} strokeWidth={2.4} /> : <Trash2 size={15} strokeWidth={2.4} />}
                  {album.deleted_at ? '복구' : '삭제'}
                </button>
              )}
            </div>

            {/* 별도 줄: 주요 액션보다 눈에 덜 띄게 */}
            <div className={styles.report}>
              <ReportButton albumId={album.id} />
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

      {album && <CommentSection albumId={album.id} />}
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
