import { apiGet, apiPut } from '@/shared/api/client'
import type { Album } from '@/entities/album/model/types'

export const PAGE_SIZE = 40

export interface AlbumQuery {
  year?: number
  artistId?: string
  q?: string
  albumType?: string // 'single' | 'album'
  sort?: string // 'tracks' (default = recent)
  deletedOnly?: boolean // admin: only soft-deleted albums (server ignores for non-admins)
}

// One page of albums. All filters optional; default sort is newest year first.
export function fetchAlbums(params: AlbumQuery & { offset: number }): Promise<Album[]> {
  return apiGet<Album[]>('/albums', {
    year: params.year,
    artist_id: params.artistId,
    q: params.q,
    type: params.albumType,
    sort: params.sort,
    deleted: params.deletedOnly ? 'only' : undefined,
    limit: PAGE_SIZE,
    offset: params.offset,
  })
}

export function fetchAlbum(id: string): Promise<Album> {
  return apiGet<Album>(`/albums/${encodeURIComponent(id)}`)
}

// Admin: 한글 표시 이름만 교체. 빈 문자열이면 해제되어 Spotify 원본명으로 돌아간다.
export function updateAlbumDisplayName(id: string, displayName: string): Promise<void> {
  return apiPut<void>(`/albums/${encodeURIComponent(id)}/display-name`, { display_name: displayName })
}

// Distinct years present in the DB, newest first.
export function fetchYears(): Promise<number[]> {
  return apiGet<number[]>('/albums/years')
}
