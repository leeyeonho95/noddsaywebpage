import { useEffect, useState } from 'react'
import { getMapRanking, RANKING_LIMIT, type RankingEntry } from '../api/rankings'
import { MAPS } from '../content/maps'
import './ranking.css'

const MAP_IDS = ['tropical-river', 'desert-oasis'] as const
const PODIUM_ORDER = [2, 1, 3]
const PAGE_SIZE = 10

function formatTime(ms: number) {
  const minutes = String(Math.floor(ms / 60000)).padStart(2, '0')
  const seconds = String(Math.floor(ms / 1000) % 60).padStart(2, '0')
  return `${minutes}:${seconds}.${String(ms % 1000).padStart(3, '0')}`
}

type RankingState =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; entries: RankingEntry[] }

function RankingBoard({ map, mapId }: { map: (typeof MAPS)[number]; mapId: string }) {
  const [ranking, setRanking] = useState<RankingState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getMapRanking(mapId, controller.signal).then(
      (entries) => {
        if (!controller.signal.aborted) setRanking({ status: 'ready', entries })
      },
      () => {
        if (!controller.signal.aborted) setRanking({ status: 'error' })
      },
    )
    return () => controller.abort()
  }, [mapId, attempt])

  const entries = ranking.status === 'ready' ? ranking.entries : []
  const firstRank = page * PAGE_SIZE + 1
  const lastRank = firstRank + PAGE_SIZE - 1
  const visibleRows = entries.filter(({ rank }) => rank >= Math.max(firstRank, 4) && rank <= lastRank)
  const lastRecordedRank = entries.at(-1)?.rank ?? 0

  return (
    <section className="ranking-board" aria-labelledby={mapId} data-map={mapId}>
      <header className="ranking-map">
        <img src={map.image} alt="" />
        <h2 id={mapId}>{map.name}</h2>
      </header>
      {entries.length > 0 ? (
        <>
          <nav className="ranking-pagination" aria-label={`${map.name} 순위 구간`}>
            {Array.from({ length: RANKING_LIMIT / PAGE_SIZE }, (_, index) => {
              const start = index * PAGE_SIZE + 1
              return (
                <button
                  key={start}
                  type="button"
                  aria-current={page === index ? 'page' : undefined}
                  disabled={start > lastRecordedRank}
                  onClick={() => setPage(index)}
                >
                  {start}–{start + PAGE_SIZE - 1}위
                </button>
              )
            })}
          </nav>
          <span className="sr-only" role="status">{firstRank}위부터 {lastRank}위까지</span>
          {page === 0 && (
            <ol className="ranking-podium" aria-label="상위 3팀">
              {PODIUM_ORDER.map((rank) => {
                const entry = entries.find((record) => record.rank === rank)
                return (
                  <li key={rank} data-rank={rank} value={rank}>
                    <span className="ranking-medal">
                      <span aria-hidden="true">{rank}</span>
                      <span className="sr-only">{rank}위</span>
                    </span>
                    <strong>{entry?.teamName ?? '—'}</strong>
                    <span className="ranking-time">{entry && formatTime(entry.finishTimeMs)}</span>
                    <span className="ranking-plinth" aria-hidden="true" />
                  </li>
                )
              })}
            </ol>
          )}
          {visibleRows.length > 0 && (
            <table className="ranking-table">
              <caption className="sr-only">{map.name} {Math.max(firstRank, 4)}–{lastRank}위</caption>
              <thead><tr><th scope="col">순위</th><th scope="col">팀명</th><th scope="col">완주 기록</th></tr></thead>
              <tbody>
                {visibleRows.map((entry) => (
                  <tr key={entry.rank}>
                    <td>{entry.rank}위</td>
                    <th scope="row">{entry.teamName}</th>
                    <td className="ranking-time">{formatTime(entry.finishTimeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <div className="ranking-status">
          <p role="status">
            {ranking.status === 'loading' && '랭킹을 가져오는 중…'}
            {ranking.status === 'ready' && '아직 완주 기록이 없어요.'}
            {ranking.status === 'error' && '랭킹을 가져오지 못했어요.'}
          </p>
          {ranking.status === 'error' && (
            <button type="button" onClick={() => {
              setRanking({ status: 'loading' })
              setAttempt((value) => value + 1)
            }}>다시 시도</button>
          )}
        </div>
      )}
    </section>
  )
}

export function RankingPage() {
  return (
    <main className="ranking-page">
      <h1>노 전당</h1>
      <div className="ranking-grid">
        <RankingBoard map={MAPS[0]} mapId={MAP_IDS[0]} />
        <RankingBoard map={MAPS[1]} mapId={MAP_IDS[1]} />
      </div>
    </main>
  )
}
