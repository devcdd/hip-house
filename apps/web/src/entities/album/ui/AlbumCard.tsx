import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import type { Album } from '@/entities/album/model/types'
import styles from './AlbumCard.module.css'

export function AlbumCard({ album }: { album: Album }) {
  const albumHref = `/albums/${encodeURIComponent(album.id)}`
  // artist_name is comma-joined; only the single-artist case maps to a known id.
  const names = album.artist_name.split(', ')

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
        <div className={styles.artist} title={album.artist_name}>
          {names.length === 1 ? (
            <Link to={`/artists/${encodeURIComponent(album.artist_id)}`} className={styles.artistLink}>
              {names[0]}
            </Link>
          ) : (
            names.map((n, i) => (
              <Fragment key={i}>
                {i > 0 && <span className={styles.sep}>, </span>}
                <Link to={`/search?q=${encodeURIComponent(n)}&type=artist`} className={styles.artistLink}>
                  {n}
                </Link>
              </Fragment>
            ))
          )}
        </div>
        {(album.release_date ?? album.year) != null && (
          <span className={styles.year}>{album.release_date ?? album.year}</span>
        )}
      </div>
    </article>
  )
}
