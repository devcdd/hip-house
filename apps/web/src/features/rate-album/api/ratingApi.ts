import { apiGet, apiPut, apiDelete } from '@/shared/api/client'

// score counts half-stars: 1..10 == 0.5..5.0 stars (mirrors the API's CHECK).
export interface Rating {
  album_id: string
  score: number
}

export const fetchRatings = (): Promise<Rating[]> => apiGet<Rating[]>('/ratings')
export const setRating = (albumId: string, score: number) =>
  apiPut(`/ratings/${encodeURIComponent(albumId)}`, { score })
export const removeRating = (albumId: string) => apiDelete(`/ratings/${encodeURIComponent(albumId)}`)
