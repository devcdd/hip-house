import { apiGet, apiPost } from '@/shared/api/client'

import type { SpotifyKey } from '@/features/crawl-artist'

// 트랙 동기화 현황 — 삭제되지 않은 앨범 기준. missing = 아직 트랙을 받아오지
// 않은 앨범 수, tracks = 저장된 전체 트랙 행 수.
export interface TrackSyncStatus {
  albums: number
  synced: number
  missing: number
  tracks: number
}

export interface TrackBackfillItem {
  id: string
  name: string
  tracks: number
  not_found?: boolean // Spotify에서 사라진 앨범 — 빈 트랙으로 완료 처리됨
}

// 한 배치의 결과. error가 있으면 서버가 배치를 중단한 것 (진행분은 저장됨).
export interface TrackBackfillResult {
  synced: number
  not_found: number
  tracks: number
  remaining: number
  albums: TrackBackfillItem[]
  error?: string
}

export function fetchTrackSyncStatus(): Promise<TrackSyncStatus> {
  return apiGet<TrackSyncStatus>('/admin/tracks/status')
}

// 미동기화 앨범을 최신 발매순으로 최대 limit개 처리 (앨범당 Spotify 요청 1회).
// remaining이 0이 될 때까지 반복 호출하는 방식.
export function backfillTracks(key: SpotifyKey, limit = 20): Promise<TrackBackfillResult> {
  return apiPost<TrackBackfillResult>('/admin/tracks/backfill', { key, limit })
}
