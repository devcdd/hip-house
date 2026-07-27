import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import type { Album } from '@/entities/album/model/types'
import styles from './AlbumCard.module.css'

export function AlbumCard({ album }: { album: Album }) {
  const albumHref = `/albums/${encodeURIComponent(album.id)}`
  // Each credited artist carries its own Spotify id, so every name links to that artist.
  const artistNames = album.artists.map((a) => a.name ?? a.id).join(', ')

  return (
    <article className={styles.card}>
      <Link to={albumHref} className={styles.art} aria-label={album.name}>
        {album.image_url ? (
          <img src={album.image_url} alt={album.name} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>{album.name.slice(0, 1)}</div>
        )}
      </Link>
      <div className={styles.meta}>
        <Link to={albumHref} className={styles.name} title={album.name}>
          {album.name}
        </Link>
        <div className={styles.artist} title={artistNames}>
          {album.artists.map((a, i) => (
            <Fragment key={a.id}>
              {i > 0 && <span className={styles.sep}>, </span>}
              <Link to={`/artists/${encodeURIComponent(a.id)}`} className={styles.artistLink}>
                {a.name ?? a.id}
              </Link>
            </Fragment>
          ))}
        </div>
        <div className={styles.footer}>
          {(album.release_date ?? album.year) != null && (
            <span className={styles.year}>{album.release_date ?? album.year}</span>
          )}
          {/* Makes 인기순 / 별점 높은 순 legible — hidden until someone rates it.
              The count in parens is COMMENTS, not raters — rating_count stays off-card. */}
          {album.rating_count > 0 && album.rating_avg != null && (
            <span className={styles.rating} title={`평균 별점 ${album.rating_avg.toFixed(1)} · 댓글 ${album.comment_count}개`}>
              <Star size={12} strokeWidth={2.2} fill="currentColor" />
              {album.rating_avg.toFixed(1)}
              {album.comment_count > 0 && <span className={styles.count}>({album.comment_count})</span>}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
