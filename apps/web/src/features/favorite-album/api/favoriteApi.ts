import { apiGet, apiPost, apiDelete } from '@/shared/api/client'
import type { Album } from '@/entities/album'

export const fetchFavorites = (): Promise<Album[]> => apiGet<Album[]>('/favorites')
export const addFavorite = (albumId: string) => apiPost('/favorites', { album_id: albumId })
export const removeFavorite = (albumId: string) => apiDelete(`/favorites/${encodeURIComponent(albumId)}`)
