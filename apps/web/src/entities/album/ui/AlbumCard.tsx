import { Fragment } from 'react'
import { Link } from 'react-router-dom'
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
        {(album.release_date ?? album.year) != null && (
          <span className={styles.year}>{album.release_date ?? album.year}</span>
        )}
      </div>
    </article>
  )
}
