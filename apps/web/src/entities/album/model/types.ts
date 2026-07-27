// Mirrors the Go `Album` struct (apps/api/albums.go).
export interface AlbumArtist {
  id: string
  name: string | null
  image_url: string | null
  genres: string[] | null
  spotify_url: string | null
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
  rating_avg: number | null // 평균 별점 0..5 (아무도 평가 안 했으면 null)
  rating_count: number
  comment_count: number // 삭제되지 않은 댓글 수 — 카드에서 별점 옆에 노출

  deleted_at: string | null // soft-delete timestamp; only admins receive deleted rows
}
