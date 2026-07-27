// Mirrors the Go `Artist` struct (apps/api/artists.go).
export interface Artist {
  id: string
  name: string | null
  image_url: string | null
  genres: string[] | null
  spotify_url: string | null
  aliases: string[] | null // 연관검색어 — admin-curated search keywords, matched alongside name
  followers: number | null // Spotify 팔로워 수 — 크롤러/enrich가 채움, 수집 전이면 null
}
