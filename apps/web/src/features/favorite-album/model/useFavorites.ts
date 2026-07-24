import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchFavorites, addFavorite, removeFavorite } from '@/features/favorite-album/api/favoriteApi'

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
  return useMutation({
    mutationFn: ({ id, favorited }: { id: string; favorited: boolean }) =>
      favorited ? removeFavorite(id) : addFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  })
}
