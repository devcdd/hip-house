import styles from './Avatar.module.css'

interface Props {
  src?: string | null
  name: string
  /** Any CSS width — a number is px. Height always follows as a 1:1 square. */
  size?: number | string
  className?: string
}

// One round artist avatar for every surface (card / detail header / admin rows).
// The circle lives on the box, never on the <img>, so a non-square source is
// clipped to a circle instead of rendering as an ellipse.
export function Avatar({ src, name, size = '100%', className }: Props) {
  return (
    <div className={className ? `${styles.avatar} ${className}` : styles.avatar} style={{ width: size }}>
      {src ? <img src={src} alt={name} loading="lazy" /> : name.slice(0, 1)}
    </div>
  )
}
