import { apiGet, apiPost } from '@/shared/api/client'
import type { User } from '@/entities/session/model/types'

export function fetchMe(): Promise<User> {
  return apiGet<User>('/me')
}

export function loginWithKakao(code: string, redirectUri: string): Promise<{ token: string; user: User }> {
  return apiPost('/auth/kakao', { code, redirect_uri: redirectUri })
}
