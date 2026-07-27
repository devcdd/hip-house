import { useParams } from 'react-router-dom'
import { useArtist } from '@/entities/artist'
import { AlbumFeed } from '@/widgets/album-feed'
import { FollowButton } from '@/features/follow-artist'
import { RefreshAlbumsButton } from '@/features/crawl-artist'
import { Avatar } from '@/shared/ui/Avatar'
import styles from './ArtistDetailPage.module.css'

export function ArtistDetailPage() {
  const { id = '' } = useParams()
  const { data: artist, isLoading, error } = useArtist(id)
  const name = artist?.name ?? artist?.id ?? id

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Avatar src={artist?.image_url} name={name} size={88} />
        <div className={styles.headerInfo}>
          <h1 className={styles.name}>{isLoading ? '불러오는 중…' : name}</h1>
          <div className={styles.headerActions}>
            {artist && <FollowButton artistId={artist.id} />}
            {artist && <RefreshAlbumsButton artistId={artist.id} />}
          </div>
        </div>
        {artist?.followers != null && (
          <div className={styles.followers}>
            <span className={styles.followersCount}>{artist.followers.toLocaleString()}</span>
            <span className={styles.followersLabel}>팔로워</span>
          </div>
        )}
      </header>

      {error && <p className={styles.state}>불러오기 실패: {String(error)}</p>}
      <AlbumFeed params={{ artistId: id }} />
    </div>
  )
}
