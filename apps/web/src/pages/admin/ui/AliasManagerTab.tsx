import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateArtistAliases, useArtistSearch, type Artist } from '@/entities/artist'
import { useInfiniteScroll } from '@/shared/lib/useInfiniteScroll'
import styles from './AdminPage.module.css'

// 연관검색어 관리: search artists, edit each one's aliases as a comma-separated list.
// Aliases make Korean queries match artists stored under English names.
export function AliasManagerTab() {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, error } = useArtistSearch(q)
  const artists = useMemo(() => data?.pages.flat() ?? [], [data])
  const sentinel = useInfiniteScroll<HTMLDivElement>(fetchNextPage, hasNextPage && !isFetching)

  return (
    <div className={styles.aliasWrap}>
      <form
        className={styles.searchForm}
        onSubmit={(e) => {
          e.preventDefault()
          setQ(input.trim())
        }}
      >
        <input
          className={styles.searchInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="아티스트 검색 (이름 또는 연관검색어)"
        />
        <button type="submit" className={styles.searchButton}>
          검색
        </button>
      </form>

      {error && <p className={styles.state}>불러오기 실패: {String(error)}</p>}
      {isLoading && <p className={styles.state}>불러오는 중…</p>}

      <div className={styles.rows}>
        {artists.map((a) => (
          <AliasRow key={a.id} artist={a} />
        ))}
      </div>
      {hasNextPage && <div ref={sentinel} className={styles.sentinel} />}
      {!isLoading && !error && artists.length === 0 && <p className={styles.state}>아티스트가 없습니다.</p>}
    </div>
  )
}

function AliasRow({ artist }: { artist: Artist }) {
  const qc = useQueryClient()
  const saved = (artist.aliases ?? []).join(', ')
  const [text, setText] = useState(saved)

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

  const name = artist.name ?? artist.id
  const dirty = text !== saved

  return (
    <form
      className={styles.row}
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
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
      <button type="submit" className={styles.save} disabled={!dirty || save.isPending}>
        {save.isPending ? '저장 중…' : '저장'}
      </button>
      {save.isError && <span className={styles.rowError}>실패</span>}
    </form>
  )
}
