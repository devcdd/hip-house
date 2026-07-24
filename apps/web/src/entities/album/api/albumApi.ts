import { apiGet } from '@/shared/api/client'
import type { Album } from '@/entities/album/model/types'

export const PAGE_SIZE = 40

export interface AlbumQuery {
  year?: number
  artistId?: string
  q?: string
  albumType?: string // 'single' | 'album'
  sort?: string // 'tracks' (default = recent)
}

// One page of albums. All filters optional; default sort is newest year first.
export function fetchAlbums(params: AlbumQuery & { offset: number }): Promise<Album[]> {
  return apiGet<Album[]>('/albums', {
    year: params.year,
    artist_id: params.artistId,
    q: params.q,
    type: params.albumType,
    sort: params.sort,
    limit: PAGE_SIZE,
    offset: params.offset,
  })
}

export function fetchAlbum(id: string): Promise<Album> {
  return apiGet<Album>(`/albums/${encodeURIComponent(id)}`)
}

// Distinct years present in the DB, newest first.
export function fetchYears(): Promise<number[]> {
  return apiGet<number[]>('/albums/years')
}
