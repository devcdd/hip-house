import { useParams } from 'react-router-dom'
import { useArtist } from '@/entities/artist'
import { AlbumFeed } from '@/widgets/album-feed'
import { FollowButton } from '@/features/follow-artist'
import { RefreshAlbumsButton } from '@/features/crawl-artist'
import { EditDisplayNameButton } from '@/features/edit-display-name'
import { Avatar } from '@/shared/ui/Avatar'
import { displayName } from '@/shared/lib/displayName'
import styles from './ArtistDetailPage.module.css'

export function ArtistDetailPage() {
  const { id = '' } = useParams()
  const { data: artist, isLoading, error } = useArtist(id)
  const name = artist ? displayName(artist) : id

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Avatar src={artist?.image_url} name={name} size={88} shape="square" />
        <div className={styles.headerInfo}>
          <h1 className={styles.name}>{isLoading ? '불러오는 중…' : name}</h1>
          <div className={styles.headerActions}>
            {artist && <FollowButton artistId={artist.id} />}
            {artist && <RefreshAlbumsButton artistId={artist.id} />}
            {/* 관리자만 보임 — Spotify 영문명 대신 쓸 한글명 등록/해제. */}
            {artist && (
              <EditDisplayNameButton
                kind="artist"
                id={artist.id}
                name={artist.name ?? artist.id}
                displayName={artist.display_name}
              />
            )}
          </div>
        </div>
        {artist?.follower_count != null && (
          <div className={styles.followers}>
            <span className={styles.followersCount}>{artist.follower_count.toLocaleString()}</span>
            <span className={styles.followersLabel}>팔로워</span>
          </div>
        )}
      </header>

      {error && <p className={styles.state}>불러오기 실패: {String(error)}</p>}
      <AlbumFeed params={{ artistId: id }} />
    </div>
  )
}
