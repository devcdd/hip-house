import { apiGet, apiPost } from '@/shared/api/client'

// Which Spotify app credentials the server should use. Any <PREFIX>_SPOTIFY_CLIENT_*
// env pair on the server is a valid key ("first", "second", "third", ...);
// fetchSpotifyKeys reports the configured ones. '' = server default pair.
export type SpotifyKey = string

export function fetchSpotifyKeys(): Promise<string[]> {
  return apiGet<string[]>('/admin/spotify/keys')
}

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
