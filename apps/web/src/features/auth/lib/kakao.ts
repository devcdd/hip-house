import { KAKAO_REST_KEY, kakaoRedirectUri } from '@/shared/config'

// Redirect to Kakao's consent screen; it returns to /auth/kakao/callback?code=...
export function startKakaoLogin() {
  if (!KAKAO_REST_KEY) {
    alert('카카오 로그인이 설정되지 않았습니다 (VITE_KAKAO_REST_API_KEY).')
    return
  }
  const u = new URL('https://kauth.kakao.com/oauth/authorize')
  u.searchParams.set('client_id', KAKAO_REST_KEY)
  u.searchParams.set('redirect_uri', kakaoRedirectUri())
  u.searchParams.set('response_type', 'code')
  window.location.href = u.toString()
}
