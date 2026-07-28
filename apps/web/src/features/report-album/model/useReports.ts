import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addFlag, fetchMyFlags, removeFlag, type FlagKind } from '@/features/report-album/api/reportApi'
import { useToast } from '@/shared/ui/toast'

// 흐름은 두 종류가 같고 문구만 다르다.
const TOASTS: Record<FlagKind, { on: string; off: string; fail: string }> = {
  'not-hiphop': {
    on: '그렇군요, 관리자가 검토 후 조치하겠습니다!',
    off: '신고를 취소했습니다',
    fail: '신고에 실패했습니다',
  },
  rename: {
    on: '요청했습니다. 관리자가 한글 이름을 등록할게요!',
    off: '요청을 취소했습니다',
    fail: '요청에 실패했습니다',
  },
}

export function useMyFlags(kind: FlagKind, enabled: boolean): Set<string> {
  const { data } = useQuery({
    queryKey: ['flags', kind],
    queryFn: () => fetchMyFlags(kind),
    enabled,
    staleTime: 60_000,
  })
  return useMemo(() => new Set(data ?? []), [data])
}

export function useToggleFlag(kind: FlagKind) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, flagged }: { id: string; flagged: boolean }) =>
      flagged ? removeFlag(kind, id) : addFlag(kind, id),
    onSuccess: (_data, { flagged }) => {
      qc.invalidateQueries({ queryKey: ['flags', kind] })
      qc.invalidateQueries({ queryKey: ['admin-flags', kind] })
      toast(flagged ? TOASTS[kind].off : TOASTS[kind].on)
    },
    onError: () => toast(TOASTS[kind].fail, 'error'),
  })
}
