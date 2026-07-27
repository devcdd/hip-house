import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Clock, Disc3, ListMusic, Play, Square } from 'lucide-react'
import { fetchSpotifyKeys } from '@/features/crawl-artist'
import { backfillTracks, fetchTrackSyncStatus } from '../api/tracksAdminApi'
import styles from './AdminPage.module.css'

const nf = new Intl.NumberFormat('ko-KR')
const BATCH = 20 // 배치당 앨범 수 — 서버가 앨범당 Spotify 요청 1회
const LOG_MAX = 300

interface LogLine {
  kind: 'ok' | 'warn' | 'error' | 'info'
  text: string
}

// 트랙 동기화 탭: 트랙을 받아온 적 없는 앨범을 순차 배치로 처리한다. 실행 버튼
// 하나 — 남은 앨범이 0이 되거나, 중지를 누르거나, Spotify 오류(쿼터 소진 등)가
// 나면 멈춘다. 크롤링 탭과 같은 키 토글로 자격증명 쌍을 고른다.
export function TracksTab() {
  const qc = useQueryClient()
  const status = useQuery({ queryKey: ['track-sync-status'], queryFn: fetchTrackSyncStatus })
  const keysQuery = useQuery({ queryKey: ['spotify-keys'], queryFn: fetchSpotifyKeys, staleTime: Infinity })
  const keys = keysQuery.data ?? []
  const [picked, setPicked] = useState('')
  const key = picked && keys.includes(picked) ? picked : (keys[0] ?? '') // '' = server default pair

  const [running, setRunning] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])
  const stopRef = useRef(false)
  // 탭을 벗어나면 다음 배치로 넘어가지 않는다 (진행 중인 배치는 서버가 마저 저장).
  useEffect(
    () => () => {
      stopRef.current = true
    },
    [],
  )

  const pushLog = (lines: LogLine[]) => setLog((prev) => [...lines, ...prev].slice(0, LOG_MAX))

  async function run() {
    stopRef.current = false
    setRunning(true)
    setStopping(false)
    setLog([])
    let albums = 0
    let tracks = 0
    try {
      for (;;) {
        const res = await backfillTracks(key, BATCH)
        albums += res.synced
        tracks += res.tracks
        // 로그는 최신이 위: 배치 내 처리 순서를 뒤집어 마지막 앨범이 맨 위로.
        pushLog(
          res.albums
            .map<LogLine>((a) =>
              a.not_found
                ? { kind: 'warn', text: `${a.name} — Spotify에서 찾을 수 없어 빈 트랙으로 처리` }
                : { kind: 'ok', text: `${a.name} — ${a.tracks}트랙` },
            )
            .reverse(),
        )
        qc.invalidateQueries({ queryKey: ['track-sync-status'] })
        if (res.error) {
          pushLog([{ kind: 'error', text: `중단됨: ${res.error}` }])
          break
        }
        if (res.remaining === 0) {
          pushLog([{ kind: 'info', text: `✅ 완료 — 앨범 ${nf.format(albums)}개, 트랙 ${nf.format(tracks)}개 저장` }])
          break
        }
        if (stopRef.current) {
          pushLog([
            { kind: 'info', text: `중지 — 앨범 ${nf.format(albums)}개 저장, ${nf.format(res.remaining)}개 남음` },
          ])
          break
        }
        if (res.synced === 0) {
          pushLog([{ kind: 'error', text: '진행되지 않아 중단했습니다.' }]) // 무한 루프 방지
          break
        }
      }
    } catch (e) {
      pushLog([{ kind: 'error', text: `요청 실패: ${String(e)}` }])
    } finally {
      setRunning(false)
      qc.invalidateQueries({ queryKey: ['track-sync-status'] })
    }
  }

  const s = status.data
  const cards = s
    ? [
        { label: '전체 앨범', value: s.albums, Icon: Disc3 },
        { label: '동기화 완료', value: s.synced, Icon: CircleCheck },
        { label: '남은 앨범', value: s.missing, Icon: Clock },
        { label: '저장된 트랙', value: s.tracks, Icon: ListMusic },
      ]
    : []

  return (
    <div className={styles.aliasWrap}>
      {status.isLoading ? (
        <p className={styles.state}>불러오는 중…</p>
      ) : status.error || !s ? (
        <p className={styles.state}>불러오기 실패: {String(status.error)}</p>
      ) : (
        <div className={styles.statGrid}>
          {cards.map(({ label, value, Icon }) => (
            <div key={label} className={styles.statCard}>
              <Icon size={16} className={styles.statIcon} aria-hidden />
              <span className={styles.statLabel}>{label}</span>
              <strong className={styles.statValue}>{nf.format(value)}</strong>
            </div>
          ))}
        </div>
      )}

      <div className={styles.crawlControls}>
        {keys.length > 0 && (
          <div className={styles.keyToggle} role="radiogroup" aria-label="Spotify API 키 선택">
            {keys.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={key === k}
                disabled={running}
                className={key === k ? `${styles.tab} ${styles.active}` : styles.tab}
                onClick={() => setPicked(k)}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {running ? (
          <button
            type="button"
            className={styles.crawlBtn}
            disabled={stopping}
            onClick={() => {
              stopRef.current = true
              setStopping(true)
            }}
          >
            <Square size={14} />
            {stopping ? '중지 중…' : '중지'}
          </button>
        ) : (
          <button type="button" className={styles.crawlBtn} disabled={!s || s.missing === 0} onClick={run}>
            <Play size={14} />
            순차 실행{s && s.missing > 0 ? ` (${nf.format(s.missing)}개)` : ''}
          </button>
        )}
        {running && <span className={styles.runNote}>배치 단위로 저장되며, 중지해도 완료된 앨범은 유지됩니다.</span>}
      </div>

      {s && s.missing === 0 && !running && log.length === 0 && (
        <p className={styles.state}>모든 앨범의 트랙이 동기화되어 있습니다.</p>
      )}

      {log.length > 0 && (
        <div className={styles.trackLog} role="log" aria-live="polite">
          {log.map((l, i) => (
            <p
              key={log.length - i}
              className={
                l.kind === 'error'
                  ? styles.trackLogErr
                  : l.kind === 'warn'
                    ? styles.trackLogWarn
                    : l.kind === 'info'
                      ? styles.trackLogInfo
                      : styles.trackLogLine
              }
            >
              {l.text}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
