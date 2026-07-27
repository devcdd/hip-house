import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { ArtistCard, ArtistCardSkeleton } from '@/entities/artist'
import { useFollowedArtists } from '@/features/follow-artist'
import { AuthGate } from './AuthGate'
import styles from './MyPage.module.css'

export function FollowedArtistsPage() {
  return (
    <AuthGate>
      <FollowedList />
    </AuthGate>
  )
}

function FollowedList() {
  const { data: artists, isLoading } = useFollowedArtists(true) // AuthGate guarantees authed

  return (
    <div className={styles.page}>
      <Link to="/me" className={styles.back}>
        <ChevronLeft size={16} aria-hidden />
        마이페이지
      </Link>
      <h1 className={styles.title}>내가 팔로우한 아티스트</h1>
      {!isLoading && (artists?.length ?? 0) === 0 ? (
        <p className={styles.state}>아직 팔로우한 아티스트가 없습니다.</p>
      ) : (
        <div className={styles.grid}>
          {/* ArtistCard already links to /artists/:id. */}
          {artists?.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
          {isLoading && Array.from({ length: 8 }, (_, i) => <ArtistCardSkeleton key={`skeleton-${i}`} />)}
        </div>
      )}
    </div>
  )
}
