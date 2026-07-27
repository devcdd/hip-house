import { useState } from 'react'
import { CornerDownRight, MessageSquare, Trash2 } from 'lucide-react'
import { useAuth } from '@/entities/session'
import { startKakaoLogin } from '@/features/auth'
import type { Comment } from '@/features/album-comments/api/commentApi'
import { useAddComment, useComments, useRemoveComment } from '@/features/album-comments/model/useComments'
import { CommentForm } from './CommentForm'
import styles from './CommentSection.module.css'

const fmt = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })

export function CommentSection({ albumId }: { albumId: string }) {
  const { user, isAuthed, isAdmin } = useAuth()
  const { threads, count, isLoading } = useComments(albumId)
  const add = useAddComment(albumId)
  const remove = useRemoveComment(albumId)
  // Only one reply box is open at a time — id of the comment being replied to.
  const [replyTo, setReplyTo] = useState<number | null>(null)

  const canDelete = (c: Comment) => !c.deleted && (isAdmin || c.user_id === user?.id)

  const row = (c: Comment, isReply: boolean) => (
    <li key={c.id} className={isReply ? styles.reply : styles.comment}>
      {isReply && <CornerDownRight size={14} className={styles.replyIcon} aria-hidden />}
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.nickname}>{c.deleted ? '' : c.nickname}</span>
          {!c.deleted && <time dateTime={c.created_at}>{fmt.format(new Date(c.created_at))}</time>}
          {canDelete(c) && (
            <button
              type="button"
              className={styles.delete}
              disabled={remove.isPending}
              aria-label="댓글 삭제"
              onClick={() => remove.mutate(c.id)}
            >
              <Trash2 size={13} strokeWidth={2.2} />
            </button>
          )}
        </div>
        <p className={c.deleted ? styles.removed : styles.text}>{c.deleted ? '삭제된 댓글입니다' : c.body}</p>
        {!isReply && isAuthed && !c.deleted && replyTo !== c.id && (
          <button type="button" className={styles.replyBtn} onClick={() => setReplyTo(c.id)}>
            답글
          </button>
        )}
      </div>
    </li>
  )

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>
        <MessageSquare size={17} strokeWidth={2.2} />
        댓글 {count > 0 && <span className={styles.count}>{count}</span>}
      </h2>

      {isAuthed ? (
        <CommentForm onSubmit={(body) => add.mutate({ body })} pending={add.isPending} />
      ) : (
        <button type="button" className={styles.login} onClick={startKakaoLogin}>
          로그인하고 댓글 남기기
        </button>
      )}

      {isLoading && <p className={styles.state}>불러오는 중…</p>}
      {!isLoading && threads.length === 0 && <p className={styles.state}>첫 댓글을 남겨보세요.</p>}

      <ul className={styles.list}>
        {threads.map(({ comment, replies }) => (
          <li key={comment.id}>
            <ul className={styles.thread}>
              {row(comment, false)}
              {replies.map((r) => row(r, true))}
            </ul>
            {replyTo === comment.id && (
              <div className={styles.replyForm}>
                <CommentForm
                  autoFocus
                  placeholder={`${comment.nickname}님에게 답글`}
                  pending={add.isPending}
                  onCancel={() => setReplyTo(null)}
                  onSubmit={(body) => {
                    add.mutate({ body, parentId: comment.id })
                    setReplyTo(null)
                  }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
