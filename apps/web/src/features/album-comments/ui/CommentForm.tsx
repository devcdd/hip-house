import { useState, type FormEvent } from 'react'
import styles from './CommentSection.module.css'

interface Props {
  onSubmit: (body: string) => void
  pending?: boolean
  placeholder?: string
  autoFocus?: boolean
  onCancel?: () => void
}

export const MAX_LEN = 1000 // mirrors the API's maxCommentLen

export function CommentForm({ onSubmit, pending, placeholder = '댓글 남기기', autoFocus, onCancel }: Props) {
  const [body, setBody] = useState('')
  const text = body.trim()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!text || pending) return
    onSubmit(text)
    setBody('')
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <textarea
        className={styles.textarea}
        value={body}
        maxLength={MAX_LEN}
        rows={2}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className={styles.formActions}>
        <span className={styles.counter}>
          {body.length}/{MAX_LEN}
        </span>
        {onCancel && (
          <button type="button" className={styles.cancel} onClick={onCancel}>
            취소
          </button>
        )}
        <button type="submit" className={styles.submit} disabled={!text || pending}>
          등록
        </button>
      </div>
    </form>
  )
}
