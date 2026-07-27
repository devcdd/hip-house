import { Skeleton } from '@/shared/ui/Skeleton'
import styles from './ArtistCard.module.css'

// Placeholder matching ArtistCard's layout: round avatar + name line.
export function ArtistCardSkeleton() {
  return (
    <div className={styles.card}>
      {/* Avatar sizing now lives in shared/ui/Avatar, so state it here explicitly. */}
      <Skeleton width="100%" radius="50%" style={{ aspectRatio: '1 / 1' }} />
      <Skeleton height={13} width="70%" radius={4} />
    </div>
  )
}
