import { apiGet, apiPost } from '@/shared/api/client'

// Which Spotify app credentials the server should use (FIRST_/SECOND_ env pairs).
export type SpotifyKey = 'first' | 'second'

export interface SpotifyArtistHit {
  id: string
  name: string
  image_url: string | null
  followers: number
  albums_in_db: number // how many albums WE already have — free local lookup
}

export interface CrawlResult {
  albums: number
  saved: boolean
  artist_name?: string | null
  artists?: number
  enriched?: number
}

export function searchSpotifyArtists(q: string, key: SpotifyKey): Promise<SpotifyArtistHit[]> {
  return apiGet<SpotifyArtistHit[]>('/admin/spotify/artists', { q, key })
}

export function crawlArtist(artistId: string, key: SpotifyKey): Promise<CrawlResult> {
  return apiPost<CrawlResult>('/admin/spotify/crawl', { artist_id: artistId, key })
}
