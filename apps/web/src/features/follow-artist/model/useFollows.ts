import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchFollows, addFollow, removeFollow } from '@/features/follow-artist/api/followApi'
import { useToast } from '@/shared/ui/toast'

export function useFollowedArtists(enabled: boolean) {
  return useQuery({ queryKey: ['follows'], queryFn: fetchFollows, enabled, staleTime: 60_000 })
}

// Set of followed artist ids (empty when logged out).
export function useFollowIds(enabled: boolean): Set<string> {
  const { data } = useFollowedArtists(enabled)
  return useMemo(() => new Set((data ?? []).map((a) => a.id)), [data])
}

export function useToggleFollow() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, following }: { id: string; following: boolean }) =>
      following ? removeFollow(id) : addFollow(id),
    onSuccess: (_data, { id, following }) => {
      qc.invalidateQueries({ queryKey: ['follows'] })
      // The artist detail header shows follower_count, so refetch it too.
      qc.invalidateQueries({ queryKey: ['artist', id] })
      toast(following ? '팔로우를 해제했습니다' : '팔로우했습니다')
    },
    onError: () => toast('팔로우 처리에 실패했습니다', 'error'),
  })
}
