import { Clock, Flame, ListMusic, Star } from 'lucide-react'
import { PopoverSelect } from '@/shared/ui/PopoverSelect'
import { SORT_OPTIONS, type SortKey } from '../model/types'

interface Props {
  value: SortKey
  onChange: (s: SortKey) => void
  disabledKeys?: SortKey[]
}

const ICONS: Record<SortKey, typeof Clock> = {
  recent: Clock,
  popular: Flame,
  rating: Star,
  tracks: ListMusic,
}

// 옵션마다 아이콘 + 한 줄 설명이 붙어야 해서 네이티브 <select>를 안 쓴다 —
// "인기순"과 "별점 높은 순"은 설명이 없으면 구분이 안 된다.
export function SortSelect({ value, onChange, disabledKeys = [] }: Props) {
  return (
    <PopoverSelect
      value={value}
      onChange={onChange}
      ariaLabel="정렬"
      options={SORT_OPTIONS.map((o) => ({
        ...o,
        icon: ICONS[o.key],
        disabled: disabledKeys.includes(o.key),
      }))}
    />
  )
}
