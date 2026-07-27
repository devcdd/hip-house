import { Star, StarHalf } from 'lucide-react'
import styles from './StarRating.module.css'

interface Props {
  score: number // half-stars, 0..10
  onChange?: (score: number) => void // omitted = read-only display
  disabled?: boolean
  size?: number
}

const STARS = [0, 1, 2, 3, 4]

// Click-only: the stars always show `score`, never a hover preview — touch has no
// hover, and previewing made the row's width jump as the label changed.
export function StarRating({ score, onChange, disabled, size = 24 }: Props) {
  const readOnly = !onChange

  return (
    <div className={styles.row} role={readOnly ? 'img' : 'group'} aria-label={readOnly ? `별점 ${score / 2}점` : '별점'}>
      {STARS.map((i) => {
        // 0 = empty, 1 = half, 2 = full. lucide's StarHalf path closes down the
        // middle, so filling it paints exactly the left half over an outline Star.
        const halves = Math.max(0, Math.min(2, score - i * 2))
        return (
          <span key={i} className={styles.star} style={{ width: size, height: size }}>
            <Star size={size} strokeWidth={1.6} className={styles.base} />
            {halves === 1 && <StarHalf size={size} strokeWidth={1.6} fill="currentColor" className={styles.fill} />}
            {halves === 2 && <Star size={size} strokeWidth={1.6} fill="currentColor" className={styles.fill} />}
            {onChange &&
              [1, 2].map((half) => {
                const value = i * 2 + half
                return (
                  <button
                    key={half}
                    type="button"
                    className={half === 1 ? styles.hitLeft : styles.hitRight}
                    disabled={disabled}
                    aria-label={`별점 ${value / 2}점`}
                    aria-pressed={score === value}
                    // Clicking the current value clears it — no separate 삭제 button.
                    onClick={() => onChange(score === value ? 0 : value)}
                  />
                )
              })}
          </span>
        )
      })}
    </div>
  )
}
