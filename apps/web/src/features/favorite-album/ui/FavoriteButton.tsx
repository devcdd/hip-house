import { useToggleFavorite } from '@/features/favorite-album/model/useFavorites'
import styles from './FavoriteButton.module.css'

interface Props {
  albumId: string
  favorited: boolean
  variant?: 'overlay' | 'inline'
}

export function FavoriteButton({ albumId, favorited, variant = 'overlay' }: Props) {
  const toggle = useToggleFavorite()
  const cls = [styles.btn, styles[variant], favorited ? styles.on : ''].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className={cls}
      aria-label={favorited ? '즐겨찾기 해제' : '즐겨찾기'}
      aria-pressed={favorited}
      disabled={toggle.isPending}
      onClick={(e) => {
        e.preventDefault()
        toggle.mutate({ id: albumId, favorited })
      }}
    >
      <span>{favorited ? '♥' : '♡'}</span>
      {variant === 'inline' && <span>{favorited ? '즐겨찾기 됨' : '즐겨찾기'}</span>}
    </button>
  )
}
