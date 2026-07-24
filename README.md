# 힙집 (hiphouse)

년도별 힙합 앨범 필터링 웹 서비스. pnpm 모노레포.

## 구조

- `apps/crawler` — 앨범 데이터 크롤러 (Spotify → 로컬 Postgres)
- `apps/web` — 웹 (예정)
- `docker-compose.yml` — 로컬 Postgres

## 데이터 소스

- **Melon ✗** — `robots.txt`가 일반 봇에 `Disallow: /` (K-pop 차트만 허용). 스크래핑 안 함.
- **Spotify ✓ (채택)** — 앨범엔 장르 필드가 없어 "장르로 앨범 검색"은 불가.
  대신 **힙합 아티스트를 직접 큐레이션**하고 각 아티스트 앨범을 ID로 수집 → 로스터가 곧 장르 필터.
  `GET /artists/{id}/albums`가 가장 안정적인 경로.
- MusicBrainz — 무인증 대안(태그+연도). 필요 시 폴백.

## 크롤러

의존성: `pg` 하나 (Postgres 드라이버). 나머지는 Node 24 네이티브 `fetch`.

**1) DB 띄우기**

```sh
docker compose up -d --wait db   # localhost:5432, db/user/pw = hiphouse (--wait: 준비될 때까지 블록)
```

**2) Spotify 키** — [dashboard](https://developer.spotify.com/dashboard)에서 앱 생성(무료),
`apps/crawler/.env.example` → `.env` 복사 후 `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` 채우기.

**3) 아티스트 ID 확보 → 로스터** — `apps/crawler/artists.txt`에 한 줄에 하나. 두 방법:

- **검색(추천)**: `pnpm --filter @hiphouse/crawler search "박재범" "사이먼 도미닉"`
  → `ID  # 이름 — followers N [장르]` 출력. 맞는 줄 골라 artists.txt에 복사(장르로 동명이인 구분).
- **수동**: Spotify 아티스트 페이지 → 공유 → "링크 복사" → 붙여넣기.

**4) 실행**

```sh
pnpm install
pnpm --filter @hiphouse/crawler crawl   # → Postgres albums/artists 테이블
pnpm --filter @hiphouse/crawler test    # 순수 로직 self-check
```

재실행 = upsert(멱등). 연도 필터는 `albums.year` 컬럼(인덱스 有). `albums.image_url`·`spotify_url`로 커버·임베드.
