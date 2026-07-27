import { Link } from 'react-router-dom'
import type { Artist } from '@/entities/artist/model/types'
import { Avatar } from '@/shared/ui/Avatar'
import styles from './ArtistCard.module.css'

export function ArtistCard({ artist }: { artist: Artist }) {
  const name = artist.name ?? artist.id
  return (
    <Link to={`/artists/${encodeURIComponent(artist.id)}`} className={styles.card}>
      <Avatar src={artist.image_url} name={name} className={styles.avatar} />
      <span className={styles.name} title={name}>
        {name}
      </span>
    </Link>
  )
}
