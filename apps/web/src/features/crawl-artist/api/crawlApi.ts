import { apiGet, apiPost } from '@/shared/api/client'

// Which Spotify app credentials the server should use. Any <PREFIX>_SPOTIFY_CLIENT_*
// env pair on the server is a valid key ("first", "second", "third", ...);
// fetchSpotifyKeys reports the configured ones. '' = server default pair.
export type SpotifyKey = string

export function fetchSpotifyKeys(): Promise<SpotifyKey[]> {
  return apiGet<SpotifyKey[]>('/admin/spotify/keys')
}

export interface CrawlResult {
  albums: number
  saved: boolean
  artist_name?: string | null
  artists?: number
  enriched?: number
}

// Admin: pull an artist's Spotify discography into the DB.
// key '' = the server's default credentials pair.
export function crawlArtist(artistId: string, key = ''): Promise<CrawlResult> {
  return apiPost<CrawlResult>('/admin/spotify/crawl', { artist_id: artistId, key })
}
