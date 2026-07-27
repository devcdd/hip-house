import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchComments, addComment, removeComment, type Comment } from '@/features/album-comments/api/commentApi'
import { useToast } from '@/shared/ui/toast'

export interface Thread {
  comment: Comment
  replies: Comment[]
}

export function useComments(albumId: string) {
  const { data, ...rest } = useQuery({
    queryKey: ['comments', albumId],
    queryFn: () => fetchComments(albumId),
  })

  // The API returns a flat list ordered thread-by-thread; nest it for rendering.
  const threads = useMemo<Thread[]>(() => {
    const roots = (data ?? []).filter((c) => c.parent_id === null)
    const byParent = new Map<number, Comment[]>()
    for (const c of data ?? []) {
      if (c.parent_id === null) continue
      const list = byParent.get(c.parent_id)
      if (list) list.push(c)
      else byParent.set(c.parent_id, [c])
    }
    return roots.map((comment) => ({ comment, replies: byParent.get(comment.id) ?? [] }))
  }, [data])

  return { threads, count: (data ?? []).filter((c) => !c.deleted).length, ...rest }
}

export function useAddComment(albumId: string) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId?: number }) => addComment(albumId, body, parentId),
    onSuccess: (_data, { parentId }) => {
      qc.invalidateQueries({ queryKey: ['comments', albumId] })
      toast(parentId ? '답글을 남겼습니다' : '댓글을 남겼습니다')
    },
    onError: () => toast('댓글 등록에 실패했습니다', 'error'),
  })
}

export function useRemoveComment(albumId: string) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: number) => removeComment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', albumId] })
      toast('댓글을 삭제했습니다')
    },
    onError: () => toast('댓글 삭제에 실패했습니다', 'error'),
  })
}
