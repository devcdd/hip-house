import { apiGet } from '@/shared/api/client'
import type { Artist } from '@/entities/artist/model/types'

export const ARTIST_PAGE_SIZE = 40

export function fetchArtist(id: string): Promise<Artist> {
  return apiGet<Artist>(`/artists/${encodeURIComponent(id)}`)
}

export function fetchArtists(params: { q?: string; offset: number }): Promise<Artist[]> {
  return apiGet<Artist[]>('/artists', { q: params.q, limit: ARTIST_PAGE_SIZE, offset: params.offset })
}
