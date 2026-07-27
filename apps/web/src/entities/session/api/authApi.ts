import { apiGet, apiPost, apiPut } from '@/shared/api/client'
import type { User } from '@/entities/session/model/types'

export function fetchMe(): Promise<User> {
  return apiGet<User>('/me')
}

// Update the signed-in user's nickname; returns the refreshed user.
export function updateNickname(nickname: string): Promise<User> {
  return apiPut<User>('/me', { nickname })
}

export interface Session {
  token: string
  refresh_token: string
  user: User
}

export function loginWithKakao(code: string, redirectUri: string): Promise<Session> {
  return apiPost('/auth/kakao', { code, redirect_uri: redirectUri })
}

// Revokes the refresh token server-side. Never rejects — signing out locally
// must not depend on the network.
export function logout(refreshToken: string | null): Promise<void> {
  return apiPost<void>('/auth/logout', { refresh_token: refreshToken }).catch(() => undefined)
}
