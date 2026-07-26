// Mirrors the Go `Artist` struct (apps/api/artists.go).
export interface Artist {
  id: string
  name: string | null
  image_url: string | null
  genres: string[] | null
  spotify_url: string | null
  aliases: string[] | null // 연관검색어 — admin-curated search keywords, matched alongside name
}
