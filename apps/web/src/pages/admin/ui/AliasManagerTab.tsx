import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GitMerge, Search, Trash2, X } from 'lucide-react'
import {
  deleteArtist,
  mergeArtists,
  updateArtistAliases,
  useArtistSearch,
  type Artist,
} from '@/entities/artist'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { useInfiniteScroll } from '@/shared/lib/useInfiniteScroll'
import styles from './AdminPage.module.css'

// 연관검색어 관리 + 아티스트 삭제/병합. Rows are checkbox-selectable; a floating
// bottom bar shows the selection and merges it into a chosen master artist.
export function AliasManagerTab() {
  const qc = useQueryClient()
  const [input, setInput] = useState('')
  const q = useDebouncedValue(input.trim(), 300) // instant search — no submit button
  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, error } = useArtistSearch(q)
  const artists = useMemo(() => data?.pages.flat() ?? [], [data])
  const sentinel = useInfiniteScroll<HTMLDivElement>(fetchNextPage, hasNextPage && !isFetching)

  // Selection: id -> display name (kept so the merge bar can label options
  // even after the list refetches or the query changes).
  const [selected, setSelected] = useState<Map<string, string>>(new Map())
  const [masterId, setMasterId] = useState('')
  const selectedIds = [...selected.keys()]
  const master = selected.has(masterId) ? masterId : (selectedIds[0] ?? '')

  const toggle = (a: Artist) =>
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(a.id)) next.delete(a.id)
      else next.set(a.id, a.name ?? a.id)
      return next
    })
  const clear = () => {
    setSelected(new Map())
    setMasterId('')
  }

  const merge = useMutation({
    mutationFn: () =>
      mergeArtists(
        master,
        selectedIds.filter((id) => id !== master),
      ),
    onSuccess: () => {
      clear()
      qc.invalidateQueries({ queryKey: ['artists'] })
      qc.invalidateQueries({ queryKey: ['albums'] }) // credits moved
    },
  })

  return (
    <div className={styles.aliasWrap}>
      <div className={styles.searchForm}>
        <Search size={15} className={styles.searchIcon} aria-hidden />
        <input
          className={styles.searchInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="아티스트 검색 (이름 또는 연관검색어)"
          aria-label="아티스트 검색"
        />
        {input && (
          <button type="button" className={styles.clearBtn} onClick={() => setInput('')} aria-label="검색어 지우기">
            <X size={14} />
          </button>
        )}
      </div>

      {error && <p className={styles.state}>불러오기 실패: {String(error)}</p>}
      {isLoading && <p className={styles.state}>불러오는 중…</p>}

      <div className={styles.rows}>
        {artists.map((a) => (
          <AliasRow
            key={a.id}
            artist={a}
            checked={selected.has(a.id)}
            onToggle={() => toggle(a)}
            onDeleted={(id) =>
              setSelected((prev) => {
                if (!prev.has(id)) return prev
                const next = new Map(prev)
                next.delete(id)
                return next
              })
            }
          />
        ))}
      </div>
      {hasNextPage && <div ref={sentinel} className={styles.sentinel} />}
      {!isLoading && !error && artists.length === 0 && <p className={styles.state}>아티스트가 없습니다.</p>}

      {selectedIds.length > 0 && (
        <div className={styles.mergeBar} role="toolbar" aria-label="선택된 아티스트 작업">
          <span className={styles.mergeCount}>{selectedIds.length}개 선택됨</span>
          {selectedIds.length >= 2 && (
            <>
              <label className={styles.mergeLabel}>
                마스터
                <select
                  className={styles.mergeSelect}
                  value={master}
                  onChange={(e) => setMasterId(e.target.value)}
                >
                  {selectedIds.map((id) => (
                    <option key={id} value={id}>
                      {selected.get(id)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={styles.mergeBtn}
                disabled={merge.isPending}
                onClick={() => merge.mutate()}
              >
                <GitMerge size={14} />
                {merge.isPending ? '병합 중…' : '합치기'}
              </button>
            </>
          )}
          {merge.isError && <span className={styles.mergeError}>실패</span>}
          <button type="button" className={styles.mergeClear} onClick={clear} aria-label="선택 해제">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

function AliasRow({
  artist,
  checked,
  onToggle,
  onDeleted,
}: {
  artist: Artist
  checked: boolean
  onToggle: () => void
  onDeleted: (id: string) => void
}) {
  const qc = useQueryClient()
  const saved = (artist.aliases ?? []).join(', ')
  const [text, setText] = useState(saved)
  const name = artist.name ?? artist.id

  const save = useMutation({
    mutationFn: () =>
      updateArtistAliases(
        artist.id,
        text.split(',').map((s) => s.trim()).filter(Boolean),
      ),
    onSuccess: (updated) => {
      setText((updated.aliases ?? []).join(', '))
      qc.invalidateQueries({ queryKey: ['artists'] })
    },
  })

  const del = useMutation({
    mutationFn: () => deleteArtist(artist.id),
    onSuccess: () => {
      onDeleted(artist.id)
      qc.invalidateQueries({ queryKey: ['artists'] })
      qc.invalidateQueries({ queryKey: ['albums'] }) // credits dropped
    },
  })

  return (
    <form
      className={styles.row}
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <input
        type="checkbox"
        className={styles.check}
        checked={checked}
        onChange={onToggle}
        aria-label={`${name} 선택`}
      />
      <div className={styles.rowAvatar}>
        {artist.image_url ? <img src={artist.image_url} alt={name} loading="lazy" /> : name.slice(0, 1)}
      </div>
      <div className={styles.rowInfo}>
        <span className={styles.rowName} title={name}>
          {name}
        </span>
        <span className={styles.rowId}>{artist.id}</span>
      </div>
      <input
        className={styles.aliasInput}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="연관검색어 (쉼표로 구분: 블랙넛, 블넛)"
      />
      <button type="submit" className={styles.save} disabled={text === saved || save.isPending}>
        {save.isPending ? '저장 중…' : '저장'}
      </button>
      {save.isError && <span className={styles.rowError}>실패</span>}
      <button
        type="button"
        className={styles.rowDelete}
        disabled={del.isPending}
        aria-label={`${name} 삭제`}
        onClick={() => {
          if (window.confirm(`"${name}" 아티스트를 삭제할까요?\n앨범 크레딧에서도 제거됩니다.`)) del.mutate()
        }}
      >
        <Trash2 size={15} />
      </button>
    </form>
  )
}
