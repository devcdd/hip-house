import { Skeleton } from '@/shared/ui/Skeleton'
import styles from './ArtistCard.module.css'

// Placeholder matching ArtistCard's layout: round avatar + name line.
export function ArtistCardSkeleton() {
  return (
    <div className={styles.card}>
      <Skeleton className={styles.avatar} radius="50%" />
      <Skeleton height={13} width="70%" radius={4} />
    </div>
  )
}
