import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMe, logout } from '@/entities/session/api/authApi'
import type { User } from '@/entities/session/model/types'
import { AUTH_CLEARED_EVENT, getRefreshToken, getToken, setTokens, clearToken } from '@/shared/lib/token'

// Current session, resolved from the stored token via GET /me.
export function useAuth() {
  const qc = useQueryClient()
  // localStorage isn't reactive: the API layer can drop the session on its own
  // (refresh token expired/revoked), so mirror it into state via the event it
  // fires — otherwise the header keeps showing a signed-in user until a reload.
  const [hasToken, setHasToken] = useState(() => !!getToken())

  useEffect(() => {
    const onCleared = () => {
      setHasToken(false)
      qc.setQueryData(['me'], null)
    }
    window.addEventListener(AUTH_CLEARED_EVENT, onCleared)
    return () => window.removeEventListener(AUTH_CLEARED_EVENT, onCleared)
  }, [qc])

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: hasToken,
    retry: false,
    staleTime: 5 * 60_000,
  })

  const signIn = (token: string, refreshToken: string, u: User) => {
    setTokens(token, refreshToken)
    setHasToken(true)
    qc.setQueryData(['me'], u)
  }

  const signOut = () => {
    // Fire and forget: revoking server-side is best effort, the local session
    // goes away either way.
    void logout(getRefreshToken())
    clearToken()
    setHasToken(false)
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
