import { Link } from 'react-router-dom'
import type { Artist } from '@/entities/artist/model/types'
import styles from './ArtistCard.module.css'

export function ArtistCard({ artist }: { artist: Artist }) {
  const name = artist.name ?? artist.id
  return (
    <Link to={`/artists/${encodeURIComponent(artist.id)}`} className={styles.card}>
      <div className={styles.avatar}>
        {artist.image_url ? <img src={artist.image_url} alt={name} loading="lazy" /> : name.slice(0, 1)}
      </div>
      <span className={styles.name} title={name}>
        {name}
      </span>
    </Link>
  )
}
