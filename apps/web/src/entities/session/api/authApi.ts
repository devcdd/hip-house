import { apiGet, apiPost, apiPut } from '@/shared/api/client'
import type { User } from '@/entities/session/model/types'

export function fetchMe(): Promise<User> {
  return apiGet<User>('/me')
}

// Update the signed-in user's nickname; returns the refreshed user.
export function updateNickname(nickname: string): Promise<User> {
  return apiPut<User>('/me', { nickname })
}

export function loginWithKakao(code: string, redirectUri: string): Promise<{ token: string; user: User }> {
  return apiPost('/auth/kakao', { code, redirect_uri: redirectUri })
}
