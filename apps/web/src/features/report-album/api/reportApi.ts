import { apiGet, apiPost, apiDelete } from '@/shared/api/client'
import type { Album } from '@/entities/album'

export interface ReportedAlbum extends Album {
  report_count: number
}

// Album ids the signed-in user flagged as "힙합이 아니에요".
export const fetchMyReports = (): Promise<string[]> => apiGet<string[]>('/not-hiphop')
export const reportAlbum = (albumId: string) => apiPost(`/albums/${encodeURIComponent(albumId)}/not-hiphop`)
export const unreportAlbum = (albumId: string) => apiDelete(`/albums/${encodeURIComponent(albumId)}/not-hiphop`)

// Admin: every flagged album, most-reported first.
export const fetchReportedAlbums = (): Promise<ReportedAlbum[]> => apiGet<ReportedAlbum[]>('/admin/not-hiphop')
export const clearReports = (albumId: string) => apiDelete(`/admin/not-hiphop/${encodeURIComponent(albumId)}`)
