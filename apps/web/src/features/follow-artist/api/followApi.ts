import { apiGet, apiPost, apiDelete } from '@/shared/api/client'
import type { Artist } from '@/entities/artist'

export const fetchFollows = (): Promise<Artist[]> => apiGet<Artist[]>('/follows')
export const addFollow = (artistId: string) => apiPost('/follows', { artist_id: artistId })
export const removeFollow = (artistId: string) => apiDelete(`/follows/${encodeURIComponent(artistId)}`)
