import { Skeleton } from '@/shared/ui/Skeleton'
import styles from './AlbumCard.module.css'

// Placeholder matching AlbumCard's layout: square art + name/artist/year lines.
export function AlbumCardSkeleton() {
  return (
    <article className={styles.card}>
      <Skeleton className={styles.art} radius={10} />
      <div className={styles.meta}>
        <Skeleton height={13} width="85%" radius={4} />
        <Skeleton height={11} width="60%" radius={4} style={{ marginTop: 4 }} />
        <Skeleton height={10} width="35%" radius={4} style={{ marginTop: 4 }} />
      </div>
    </article>
  )
}
