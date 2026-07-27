import { apiGet } from '@/shared/api/client'

import type { SpotifyKey } from '@/features/crawl-artist'

export interface SpotifyArtistHit {
  id: string
  name: string
  image_url: string | null
  followers: number
  albums_in_db: number // how many albums WE already have — free local lookup
}

export function searchSpotifyArtists(q: string, key: SpotifyKey): Promise<SpotifyArtistHit[]> {
  return apiGet<SpotifyArtistHit[]>('/admin/spotify/artists', { q, key })
}
