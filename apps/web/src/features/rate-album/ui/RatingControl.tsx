import { useEffect, useRef, useState } from 'react'
import { Star, X } from 'lucide-react'
import { useSetRating } from '@/features/rate-album/model/useRatings'
import { StarRating } from './StarRating'
import styles from './RatingControl.module.css'

interface Props {
  albumId: string
  score: number // half-stars, 0..10
}

// Rating always goes through a dialog with oversized stars — the inline
// half-star targets were too small to hit reliably on any pointer, not just touch.
export function RatingControl({ albumId, score }: Props) {
  const rate = useSetRating()
  const [open, setOpen] = useState(false)
  // Dialog picks are staged locally and only saved on 평가하기.
  const [pick, setPick] = useState(score)
  const dialog = useRef<HTMLDialogElement>(null)

  // Native <dialog> for free backdrop, focus trap and Escape handling.
  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  const submit = (next: number) => {
    if (next !== score) rate.mutate({ id: albumId, score: next })
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => {
          setPick(score) // discard any pick left over from a cancelled open
          setOpen(true)
        }}
      >
        <Star size={15} strokeWidth={2.2} fill={score ? 'currentColor' : 'none'} />
        {score ? `내 별점 ${score / 2}점` : '평가하기'}
      </button>

      <dialog
        ref={dialog}
        className={styles.dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
      >
        <div className={styles.sheet}>
          <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="닫기">
            <X size={18} strokeWidth={2.4} />
          </button>
          <p className={styles.title}>이 앨범 어땠나요?</p>
          <StarRating score={pick} size={46} onChange={setPick} />
          <p className={styles.picked}>{pick ? `${pick / 2}점` : '별을 눌러 점수를 고르세요'}</p>
          <button type="button" className={styles.submit} disabled={rate.isPending} onClick={() => submit(pick)}>
            평가하기
          </button>
          {score > 0 && (
            <button type="button" className={styles.clear} onClick={() => submit(0)}>
              별점 지우기
            </button>
          )}
        </div>
      </dialog>
    </>
  )
}
