/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_KAKAO_REST_API_KEY?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
