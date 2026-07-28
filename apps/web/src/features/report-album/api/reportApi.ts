import { apiGet, apiPost, apiDelete } from '@/shared/api/client'
import type { Album } from '@/entities/album'

// 사용자가 앨범에 다는 두 가지 플래그. 서버 테이블만 다르고 흐름은 같다.
//   not-hiphop — "힙합이 아니에요" 신고
//   rename     — "앨범명 좀 바꿔주세요" (한글 표시 이름 요청)
export type FlagKind = 'not-hiphop' | 'rename'

const PATHS: Record<FlagKind, { mine: string; album: string; admin: string }> = {
  'not-hiphop': { mine: '/not-hiphop', album: 'not-hiphop', admin: '/admin/not-hiphop' },
  rename: { mine: '/rename-requests', album: 'rename-request', admin: '/admin/rename-requests' },
}

export interface FlaggedAlbum extends Album {
  report_count: number // 플래그를 누른 사람 수
}

const albumPath = (kind: FlagKind, albumId: string) =>
  `/albums/${encodeURIComponent(albumId)}/${PATHS[kind].album}`

// 로그인한 사용자가 플래그한 앨범 id 목록 — 버튼 상태 렌더용.
export const fetchMyFlags = (kind: FlagKind): Promise<string[]> => apiGet<string[]>(PATHS[kind].mine)
export const addFlag = (kind: FlagKind, albumId: string) => apiPost(albumPath(kind, albumId))
export const removeFlag = (kind: FlagKind, albumId: string) => apiDelete(albumPath(kind, albumId))

// 관리자: 플래그된 앨범 전체, 많이 눌린 순.
export const fetchFlaggedAlbums = (kind: FlagKind): Promise<FlaggedAlbum[]> =>
  apiGet<FlaggedAlbum[]>(PATHS[kind].admin)
export const clearFlags = (kind: FlagKind, albumId: string) =>
  apiDelete(`${PATHS[kind].admin}/${encodeURIComponent(albumId)}`)
