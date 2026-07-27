import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchFavorites, addFavorite, removeFavorite } from '@/features/favorite-album/api/favoriteApi'
import { useToast } from '@/shared/ui/toast'

export function useFavoriteAlbums(enabled: boolean) {
  return useQuery({ queryKey: ['favorites'], queryFn: fetchFavorites, enabled, staleTime: 60_000 })
}

// Set of favorited album ids (empty when logged out).
export function useFavoriteIds(enabled: boolean): Set<string> {
  const { data } = useFavoriteAlbums(enabled)
  return useMemo(() => new Set((data ?? []).map((a) => a.id)), [data])
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, favorited }: { id: string; favorited: boolean }) =>
      favorited ? removeFavorite(id) : addFavorite(id),
    onSuccess: (_data, { favorited }) => {
      qc.invalidateQueries({ queryKey: ['favorites'] })
      toast(favorited ? '즐겨찾기에서 뺐습니다' : '즐겨찾기에 담았습니다')
    },
    onError: () => toast('즐겨찾기 저장에 실패했습니다', 'error'),
  })
}
