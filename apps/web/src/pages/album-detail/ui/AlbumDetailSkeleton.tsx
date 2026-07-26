import { Skeleton } from '@/shared/ui/Skeleton'
import styles from './AlbumDetailPage.module.css'

// Placeholder matching the album detail layout: cover art, title/artist/facts, and the embed.
export function AlbumDetailSkeleton() {
  return (
    <>
      <div className={styles.content}>
        <Skeleton className={styles.art} radius={12} />
        <div className={styles.info}>
          <Skeleton height={30} width="70%" radius={6} />
          <Skeleton height={18} width="45%" radius={4} style={{ marginTop: 4 }} />
          <div className={styles.facts} style={{ marginTop: 16 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={styles.fact}>
                <Skeleton height={10} width="60%" radius={4} />
                <Skeleton height={15} width="80%" radius={4} style={{ marginTop: 6 }} />
              </div>
            ))}
          </div>
          <div className={styles.actions}>
            <Skeleton height={38} width={140} radius={999} />
            <Skeleton height={38} width={120} radius={999} />
          </div>
        </div>
      </div>
      <section className={styles.tracks}>
        <Skeleton height={20} width={100} radius={4} />
        <Skeleton className={styles.embed} radius={12} />
      </section>
    </>
  )
}
