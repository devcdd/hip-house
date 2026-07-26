// Mirrors the Go `Album` struct (apps/api/albums.go).
export interface AlbumArtist {
  id: string
  name: string | null
}

export interface Album {
  id: string
  name: string
  artists: AlbumArtist[] // every credited artist, ordered; from the album_artists join
  release_date: string | null
  year: number | null
  album_type: string | null
  total_tracks: number | null
  image_url: string | null
  spotify_url: string | null
  type_label: string | null // 싱글 | EP | 정규 (server-computed)
  deleted_at: string | null // soft-delete timestamp; only admins receive deleted rows
}
