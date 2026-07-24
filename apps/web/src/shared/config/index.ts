// Dev goes through Vite proxy (/api). Override in prod via VITE_API_BASE.
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

// Kakao OAuth — REST API key from the Kakao developer console.
export const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY ?? ''
export const kakaoRedirectUri = () => window.location.origin + '/auth/kakao/callback'
