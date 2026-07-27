import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchYears } from '@/entities/album'
import { ALL, type YearOption } from './types'

// [All, 2026, 2025, ...] — tab options for the year filter.
// Memoized: a fresh array on every render makes it useless as an effect dep,
// and YearFilter uses it as one to scroll the selected year into view.
export function useYears(): YearOption[] {
  const { data } = useQuery({ queryKey: ['years'], queryFn: fetchYears, staleTime: Infinity })
  return useMemo(() => [ALL, ...(data ?? [])], [data])
}
