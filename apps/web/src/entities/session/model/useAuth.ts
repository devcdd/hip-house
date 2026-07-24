import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMe } from '@/entities/session/api/authApi'
import type { User } from '@/entities/session/model/types'
import { getToken, setToken, clearToken } from '@/shared/lib/token'

// Current session, resolved from the stored token via GET /me.
export function useAuth() {
  const qc = useQueryClient()
  const hasToken = !!getToken()

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: hasToken,
    retry: false,
    staleTime: 5 * 60_000,
  })

  const signIn = (token: string, u: User) => {
    setToken(token)
    qc.setQueryData(['me'], u)
  }

  const signOut = () => {
    clearToken()
    qc.setQueryData(['me'], null)
    qc.removeQueries({ queryKey: ['favorites'] })
  }

  return {
    user: user ?? null,
    isAuthed: hasToken && !!user,
    isAdmin: user?.role === 'admin',
    isLoading: hasToken && isLoading,
    signIn,
    signOut,
  }
}
