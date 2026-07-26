import type { CSSProperties } from 'react'
import styles from './Skeleton.module.css'

// A shimmering placeholder block. Size it via width/height/radius or with `style`
// (e.g. aspect-ratio, borderRadius) so it matches the real content it stands in for.
export function Skeleton({
  width,
  height,
  radius,
  className,
  style,
}: {
  width?: string | number
  height?: string | number
  radius?: string | number
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={className ? `${styles.skeleton} ${className}` : styles.skeleton}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden
    />
  )
}
