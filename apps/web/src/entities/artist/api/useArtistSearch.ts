import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchArtists, ARTIST_PAGE_SIZE } from '@/entities/artist/api/artistApi'

// Paginated artist list, optionally filtered by name query.
export function useArtistSearch(q: string) {
  return useInfiniteQuery({
    queryKey: ['artists', q],
    queryFn: ({ pageParam }) => fetchArtists({ q, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < ARTIST_PAGE_SIZE ? undefined : pages.length * ARTIST_PAGE_SIZE),
  })
}
