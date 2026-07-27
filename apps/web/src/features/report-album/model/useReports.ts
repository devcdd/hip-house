import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMyReports, reportAlbum, unreportAlbum } from '@/features/report-album/api/reportApi'
import { useToast } from '@/shared/ui/toast'

export function useMyReports(enabled: boolean): Set<string> {
  const { data } = useQuery({ queryKey: ['not-hiphop'], queryFn: fetchMyReports, enabled, staleTime: 60_000 })
  return useMemo(() => new Set(data ?? []), [data])
}

export function useToggleReport() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, reported }: { id: string; reported: boolean }) =>
      reported ? unreportAlbum(id) : reportAlbum(id),
    onSuccess: (_data, { reported }) => {
      qc.invalidateQueries({ queryKey: ['not-hiphop'] })
      qc.invalidateQueries({ queryKey: ['admin-reports'] })
      toast(reported ? '신고를 취소했습니다' : '그렇군요, 관리자가 검토 후 조치하겠습니다!')
    },
    onError: () => toast('신고에 실패했습니다', 'error'),
  })
}
