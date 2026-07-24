import { useQuery } from '@tanstack/react-query'
import { fetchAlbum } from '@/entities/album/api/albumApi'

export function useAlbum(id: string) {
  return useQuery({
    queryKey: ['album', id],
    queryFn: () => fetchAlbum(id),
    enabled: id !== '',
  })
}
