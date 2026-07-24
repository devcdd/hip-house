import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchAlbums, PAGE_SIZE, type AlbumQuery } from '@/entities/album/api/albumApi'

// Paginated album feed. Any combination of year / artistId / q filters.
// React Query owns caching, dedup, and stale-request cancellation — changing
// filters is just a new queryKey.
export function useAlbumFeed(params: AlbumQuery) {
  return useInfiniteQuery({
    queryKey: ['albums', params],
    queryFn: ({ pageParam }) => fetchAlbums({ ...params, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE),
  })
}
