const KEY = 'token'
const REFRESH_KEY = 'refresh_token'

// Fired after the stored session is dropped (refresh failed / logout) so the
// React layer can clear its cached user without this module importing it.
export const AUTH_CLEARED_EVENT = 'hiphouse:auth-cleared'

export const getToken = (): string | null => localStorage.getItem(KEY)
export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_KEY)

export function setTokens(token: string, refreshToken: string) {
  localStorage.setItem(KEY, token)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearToken() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(REFRESH_KEY)
  window.dispatchEvent(new Event(AUTH_CLEARED_EVENT))
}
