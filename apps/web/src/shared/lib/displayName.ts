// 화면에 보여줄 이름: 관리자가 등록한 한글명 > Spotify 원본명 > id.
// Spotify는 유통사가 등록한 이름(대개 영문) 하나만 주기 때문에, 한글 표기는
// display_name(관리자 편집)에서만 나온다.
export const displayName = (x: {
  id: string
  name?: string | null
  display_name?: string | null
}) => x.display_name || x.name || x.id
