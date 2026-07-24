import { useQuery } from '@tanstack/react-query'
import { fetchArtist } from '@/entities/artist/api/artistApi'

export function useArtist(id: string) {
  return useQuery({ queryKey: ['artist', id], queryFn: () => fetchArtist(id), enabled: id !== '' })
}
