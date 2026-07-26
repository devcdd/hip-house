import { useParams } from 'react-router-dom'
import { useArtist } from '@/entities/artist'
import { AlbumFeed } from '@/widgets/album-feed'
import styles from './ArtistDetailPage.module.css'

export function ArtistDetailPage() {
  const { id = '' } = useParams()
  const { data: artist, isLoading, error } = useArtist(id)
  const name = artist?.name ?? artist?.id ?? id

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.avatar}>
          {artist?.image_url ? <img src={artist.image_url} alt={name} /> : name.slice(0, 1)}
        </div>
        <h1 className={styles.name}>{isLoading ? '불러오는 중…' : name}</h1>
      </header>

      {error && <p className={styles.state}>불러오기 실패: {String(error)}</p>}
      <AlbumFeed params={{ artistId: id }} />
    </div>
  )
}
