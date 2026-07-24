import { useQuery } from '@tanstack/react-query'
import { fetchYears } from '@/entities/album'
import { ALL, type YearOption } from './types'

// [All, 2026, 2025, ...] — tab options for the year filter.
export function useYears(): YearOption[] {
  const { data } = useQuery({ queryKey: ['years'], queryFn: fetchYears, staleTime: Infinity })
  return [ALL, ...(data ?? [])]
}
