export type AlbumType = 'single' | 'ep' | 'album'
export type SortKey = 'recent' | 'tracks' | 'popular'

// Multi-select types -> comma-separated server param (undefined = 전체).
export const toTypeParam = (types: AlbumType[]): string | undefined => (types.length ? types.join(',') : undefined)
export const toSortParam = (s: SortKey): string | undefined => (s === 'recent' ? undefined : s)

const VALID_TYPES = new Set<AlbumType>(['single', 'ep', 'album'])
export const parseTypes = (raw: string | null): AlbumType[] =>
  (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is AlbumType => VALID_TYPES.has(s as AlbumType))

export const TYPE_OPTIONS: { key: AlbumType; label: string }[] = [
  { key: 'single', label: '싱글' },
  { key: 'ep', label: 'EP' },
  { key: 'album', label: '정규' },
]

export const SORT_OPTIONS: { key: SortKey; label: string; disabled?: boolean }[] = [
  { key: 'recent', label: '최신순' },
  { key: 'tracks', label: '트랙 많은 순' },
  { key: 'popular', label: '인기순', disabled: true },
]
