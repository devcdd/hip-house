import { apiGet, apiPut, apiDelete } from '@/shared/api/client'
import type { Album } from '@/entities/album'

// score counts half-stars: 1..10 == 0.5..5.0 stars (mirrors the API's CHECK).
export interface Rating {
  album_id: string
  score: number
}

export const fetchRatings = (): Promise<Rating[]> => apiGet<Rating[]>('/ratings')

// Full album rows the user has rated (most-recently rated first) — for the my-page.
export const fetchRatedAlbums = (): Promise<Album[]> => apiGet<Album[]>('/ratings/albums')
export const setRating = (albumId: string, score: number) =>
  apiPut(`/ratings/${encodeURIComponent(albumId)}`, { score })
export const removeRating = (albumId: string) => apiDelete(`/ratings/${encodeURIComponent(albumId)}`)
