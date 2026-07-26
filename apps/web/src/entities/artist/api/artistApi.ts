import { apiDelete, apiGet, apiPost, apiPut } from '@/shared/api/client'
import type { Artist } from '@/entities/artist/model/types'

export const ARTIST_PAGE_SIZE = 40

export function fetchArtist(id: string): Promise<Artist> {
  return apiGet<Artist>(`/artists/${encodeURIComponent(id)}`)
}

export function fetchArtists(params: { q?: string; offset: number }): Promise<Artist[]> {
  return apiGet<Artist[]>('/artists', { q: params.q, limit: ARTIST_PAGE_SIZE, offset: params.offset })
}

// Replace just the 연관검색어 (admin-only; other fields stay crawler-owned).
export function updateArtistAliases(id: string, aliases: string[]): Promise<Artist> {
  return apiPut<Artist>(`/artists/${encodeURIComponent(id)}/aliases`, { aliases })
}

// Admin: delete an artist (server also drops its album credits).
export function deleteArtist(id: string): Promise<void> {
  return apiDelete<void>(`/artists/${encodeURIComponent(id)}`)
}

// Admin: fold mergedIds into masterId — credits move over, names/aliases become
// the master's aliases, duplicates are deleted.
export function mergeArtists(masterId: string, mergedIds: string[]): Promise<Artist> {
  return apiPost<Artist>('/artists/merge', { master_id: masterId, merged_ids: mergedIds })
}
